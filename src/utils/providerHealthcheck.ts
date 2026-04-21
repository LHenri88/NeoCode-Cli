// E2.2 — Provider healthcheck + automatic fallback
//
// Provides async health probes per provider and a fallback chain that
// getAPIProviderWithFallback() iterates until one responds.

import type { APIProvider } from './model/providers.js'
import { hasLocalOllama } from './providerDiscovery.js'
import { logForDebugging } from './debug.js'

export type HealthResult = {
  ok: boolean
  latencyMs: number
  error?: string
}

// Cache so the sync getAPIProvider() can return a pre-probed Ollama result.
let cachedOllamaAvailable: boolean | null = null
let lastProbeAt = 0
const PROBE_TTL_MS = 60_000 // re-probe at most once per minute

/** Returns cached Ollama availability (true/false/null=unknown). */
export function getCachedOllamaAvailable(): boolean | null {
  return cachedOllamaAvailable
}

/** Probes Ollama and caches the result. Call at startup. */
export async function probeOllamaAvailability(): Promise<boolean> {
  if (Date.now() - lastProbeAt < PROBE_TTL_MS && cachedOllamaAvailable !== null) {
    return cachedOllamaAvailable
  }
  const available = await hasLocalOllama()
  cachedOllamaAvailable = available
  lastProbeAt = Date.now()
  logForDebugging(`[providerHealthcheck] Ollama probe: ${available}`)
  return available
}

/** Check health of a specific provider. */
export async function checkProviderHealth(
  provider: APIProvider,
): Promise<HealthResult> {
  const start = Date.now()
  try {
    switch (provider) {
      case 'firstParty': {
        // Probe Anthropic API status endpoint (lightweight HEAD)
        const baseUrl =
          process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'
        const response = await fetch(`${baseUrl}/v1/models`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000),
          headers: process.env.ANTHROPIC_API_KEY
            ? { 'x-api-key': process.env.ANTHROPIC_API_KEY }
            : {},
        })
        return { ok: response.ok, latencyMs: Date.now() - start }
      }

      case 'openai': {
        const baseUrl =
          process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
        const response = await fetch(`${baseUrl}/models`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000),
          headers: process.env.OPENAI_API_KEY
            ? { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
            : {},
        })
        return { ok: response.ok, latencyMs: Date.now() - start }
      }

      case 'gemini': {
        const baseUrl =
          process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com'
        const response = await fetch(
          `${baseUrl}/v1beta/models?key=${process.env.GEMINI_API_KEY ?? ''}`,
          { method: 'HEAD', signal: AbortSignal.timeout(3000) },
        )
        return { ok: response.ok, latencyMs: Date.now() - start }
      }

      case 'github': {
        const baseUrl =
          process.env.GITHUB_BASE_URL ?? 'https://models.inference.ai.azure.com'
        const response = await fetch(`${baseUrl}/info`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000),
          headers: process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {},
        })
        return { ok: response.ok, latencyMs: Date.now() - start }
      }

      case 'bedrock':
      case 'vertex':
      case 'foundry':
      case 'codex':
        // These require heavier SDK init; assume available if configured
        return { ok: true, latencyMs: Date.now() - start }

      default:
        return {
          ok: false,
          latencyMs: Date.now() - start,
          error: `unknown provider: ${provider as string}`,
        }
    }
  } catch (e: unknown) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: (e as Error).message,
    }
  }
}

/**
 * Returns the preferred fallback chain for the current environment.
 * Order: configured provider → Ollama (if available) → firstParty.
 */
export function buildFallbackChain(primary: APIProvider): APIProvider[] {
  const chain: APIProvider[] = [primary]
  if (primary !== 'openai' && cachedOllamaAvailable) {
    chain.push('openai') // Ollama speaks OpenAI protocol
  }
  if (primary !== 'firstParty') {
    chain.push('firstParty')
  }
  return chain
}

/**
 * Iterates the fallback chain and returns the first healthy provider.
 * Falls back to primary if none respond (degraded mode).
 */
export async function getHealthyProvider(
  primary: APIProvider,
): Promise<APIProvider> {
  const chain = buildFallbackChain(primary)
  for (const provider of chain) {
    const result = await checkProviderHealth(provider)
    if (result.ok) {
      logForDebugging(
        `[providerHealthcheck] healthy provider: ${provider} (${result.latencyMs}ms)`,
      )
      return provider
    }
    logForDebugging(
      `[providerHealthcheck] provider ${provider} unhealthy: ${result.error ?? 'no response'}`,
    )
  }
  logForDebugging(
    `[providerHealthcheck] all providers unhealthy, using primary: ${primary}`,
  )
  return primary
}
