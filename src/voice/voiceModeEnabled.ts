/**
 * Voice mode availability checks for NeoCode.
 *
 * Decoupled from Anthropic OAuth — voice works with any provider that
 * exposes an OpenAI-compatible STT endpoint, or with a local Whisper
 * server. Falls back to Anthropic's voice_stream when the user is
 * logged in with Claude.ai OAuth.
 */

import { isAnthropicAuthEnabled, getClaudeAIOAuthTokens } from '../utils/auth.js'
import { getGlobalConfig } from '../utils/config.js'
import { isWindowsSpeechAvailable } from '../services/windowsSpeechRecognition.js'

/** Returns true when the Anthropic voice_stream WebSocket is usable. */
export function hasVoiceAuth(): boolean {
  if (!isAnthropicAuthEnabled()) return false
  const tokens = getClaudeAIOAuthTokens()
  return Boolean(tokens?.accessToken)
}

/**
 * Returns true when a Whisper-compatible STT endpoint is configured.
 * Checks WHISPER_BASE_URL env or globalConfig.whisperBaseUrl.
 */
export function hasWhisperEndpoint(): boolean {
  if (process.env.WHISPER_BASE_URL) return true
  const cfg = getGlobalConfig()
  return Boolean((cfg as Record<string, unknown>).whisperBaseUrl)
}

/**
 * Full runtime check — voice is available when any of the following:
 *   a) User has Anthropic OAuth (uses voice_stream endpoint)
 *   b) A Whisper-compatible STT URL is configured (any provider / local)
 *   c) Running on Windows (uses built-in System.Speech recognition — no credentials)
 *
 * No GrowthBook kill-switch — NeoCode is open-source and multi-provider.
 */
export function isVoiceModeEnabled(): boolean {
  return hasVoiceAuth() || hasWhisperEndpoint() || isWindowsSpeechAvailable()
}

/**
 * Kept for back-compat with call sites that import isVoiceGrowthBookEnabled.
 * Always returns true in NeoCode (no GrowthBook).
 */
export function isVoiceGrowthBookEnabled(): boolean {
  return true
}
