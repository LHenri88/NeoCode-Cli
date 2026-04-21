import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { shouldUseCodexTransport } from '../../services/api/providerConfig.js'
import { isEnvTruthy } from '../envUtils.js'
import { getCachedOllamaAvailable } from '../providerHealthcheck.js'

export type APIProvider =
  | 'firstParty'
  | 'bedrock'
  | 'vertex'
  | 'foundry'
  | 'openai'
  | 'gemini'
  | 'github'
  | 'codex'

export function getAPIProvider(): APIProvider {
  return isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI)
    ? 'gemini'
    : isEnvTruthy(process.env.CLAUDE_CODE_USE_GITHUB)
      ? 'github'
      : isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI)
        ? isCodexModel()
          ? 'codex'
          : 'openai'
        : isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)
          ? 'bedrock'
          : isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)
            ? 'vertex'
            : isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)
              ? 'foundry'
              : getDefaultProvider()
}

/**
 * E2.1 — Ollama auto-detection as default provider.
 * Uses the cached probe result from probeOllamaAvailability() (called at
 * startup). Falls back to firstParty when no local Ollama is detected.
 */
function getDefaultProvider(): APIProvider {
  // If ANTHROPIC_API_KEY is explicitly set, honour firstParty intent.
  if (process.env.ANTHROPIC_API_KEY) return 'firstParty'
  // If Ollama was detected at startup, use OpenAI-compat transport.
  if (getCachedOllamaAvailable() === true) return 'openai'
  return 'firstParty'
}

export function usesAnthropicAccountFlow(): boolean {
  return getAPIProvider() === 'firstParty'
}
function isCodexModel(): boolean {
  return shouldUseCodexTransport(
    process.env.OPENAI_MODEL || '',
    process.env.OPENAI_BASE_URL ?? process.env.OPENAI_API_BASE,
  )
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party Anthropic API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
