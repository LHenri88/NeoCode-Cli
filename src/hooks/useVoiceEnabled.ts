import { useMemo } from 'react'
import { useAppState, type AppState } from '../state/AppState.js'
import {
  hasVoiceAuth,
  hasWhisperEndpoint,
  isVoiceGrowthBookEnabled,
} from '../voice/voiceModeEnabled.js'
import { isWindowsSpeechAvailable } from '../services/windowsSpeechRecognition.js'

/**
 * Combines user intent (settings.voiceEnabled) with auth + GB kill-switch.
 * Only the auth half is memoized on authVersion — it's the expensive one
 * (cold getClaudeAIOAuthTokens memoize → sync `security` spawn, ~60ms/call,
 * ~180ms total in profile v5 when token refresh cleared the cache mid-session).
 * GB is a cheap cached-map lookup and stays outside the memo so a mid-session
 * kill-switch flip still takes effect on the next render.
 *
 * authVersion bumps on /login only. Background token refresh leaves it alone
 * (user is still authed), so the auth memo stays correct without re-eval.
 *
 * NeoCode: voice is available when any of the following is true:
 *   a) Windows (System.Speech built-in — no credentials needed)
 *   b) Whisper endpoint configured (WHISPER_BASE_URL or globalConfig.whisperBaseUrl)
 *   c) Anthropic OAuth (voice_stream WebSocket)
 */
export function useVoiceEnabled(): boolean {
  const userIntent = useAppState((s: AppState) => s.settings.voiceEnabled === true)
  const authVersion = useAppState((s: AppState) => s.authVersion)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const authed = useMemo(hasVoiceAuth, [authVersion])
  // Windows and Whisper don't require Anthropic OAuth
  if (isWindowsSpeechAvailable() || hasWhisperEndpoint()) {
    return userIntent && isVoiceGrowthBookEnabled()
  }
  return userIntent && authed && isVoiceGrowthBookEnabled()
}
