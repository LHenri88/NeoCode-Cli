/**
 * OmniRoute Integration Service
 *
 * OmniRoute is an OpenAI-compatible API gateway (https://github.com/diegosouzapw/OmniRoute)
 * that routes requests across 100+ LLM providers with automatic fallback chains.
 *
 * When any configured provider exhausts its quota or rate limit, this service
 * provides an alternative providerOverride pointing to a running OmniRoute instance,
 * which then transparently routes to the next available provider in its combo chain.
 *
 * Configuration via environment variables:
 *   OMNIROUTE_ENABLED=1           — opt-in (default: off)
 *   OMNIROUTE_BASE_URL             — gateway URL (default: http://localhost:20128/v1)
 *   OMNIROUTE_MODEL                — combo/model name to use (default: auto-detected)
 *   OMNIROUTE_API_KEY              — API key if the gateway requires one (default: none)
 *   OMNIROUTE_HEALTH_TIMEOUT_MS    — health check timeout in ms (default: 3000)
 */

import { isEnvTruthy } from '../../utils/envUtils.js'

export const OMNIROUTE_DEFAULT_BASE_URL = 'http://localhost:20128/v1'
export const OMNIROUTE_DEFAULT_MODEL = 'claude-sonnet-4-6' // sensible default; user sets the combo in OmniRoute
export const OMNIROUTE_HEALTH_PATH = '/models'

/** Cached availability state so we don't re-check on every retry */
let _available: boolean | null = null
let _lastCheck = 0
const AVAILABILITY_CACHE_MS = 30_000

export function isOmniRouteEnabled(): boolean {
  return isEnvTruthy(process.env.OMNIROUTE_ENABLED)
}

export function getOmniRouteBaseUrl(): string {
  return (process.env.OMNIROUTE_BASE_URL ?? OMNIROUTE_DEFAULT_BASE_URL).replace(
    /\/+$/,
    '',
  )
}

export function getOmniRouteModel(): string {
  return process.env.OMNIROUTE_MODEL ?? OMNIROUTE_DEFAULT_MODEL
}

export function getOmniRouteApiKey(): string {
  return process.env.OMNIROUTE_API_KEY ?? 'omniroute'
}

/**
 * Returns the providerOverride object needed by getAnthropicClient() /
 * createOpenAIShimClient() to route through OmniRoute.
 */
export function getOmniRouteProviderOverride(): {
  model: string
  baseURL: string
  apiKey: string
} {
  return {
    model: getOmniRouteModel(),
    baseURL: getOmniRouteBaseUrl(),
    apiKey: getOmniRouteApiKey(),
  }
}

/**
 * Performs a lightweight health check against the OmniRoute /models endpoint.
 * Result is cached for AVAILABILITY_CACHE_MS to avoid hammering the gateway.
 */
export async function isOmniRouteAvailable(): Promise<boolean> {
  if (!isOmniRouteEnabled()) return false

  const now = Date.now()
  if (_available !== null && now - _lastCheck < AVAILABILITY_CACHE_MS) {
    return _available
  }

  const timeoutMs = parseInt(
    process.env.OMNIROUTE_HEALTH_TIMEOUT_MS ?? '3000',
    10,
  )

  try {
    const url = `${getOmniRouteBaseUrl()}${OMNIROUTE_HEALTH_PATH}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${getOmniRouteApiKey()}` },
      signal: controller.signal,
    })
    clearTimeout(timer)
    _available = response.ok
  } catch {
    _available = false
  }

  _lastCheck = Date.now()
  return _available
}

/** Invalidate cached availability — call after a known gateway restart */
export function resetOmniRouteAvailabilityCache(): void {
  _available = null
  _lastCheck = 0
}
