import { normalizeLanguageForSTT } from '../../hooks/useVoice.js'
import { getShortcutDisplay } from '../../keybindings/shortcutFormat.js'
import { logEvent } from '../../services/analytics/index.js'
import type { LocalCommandCall } from '../../types/command.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { settingsChangeDetector } from '../../utils/settings/changeDetector.js'
import {
  getInitialSettings,
  updateSettingsForSource,
} from '../../utils/settings/settings.js'
import { isVoiceModeEnabled } from '../../voice/voiceModeEnabled.js'

const LANG_HINT_MAX_SHOWS = 2

export const call: LocalCommandCall = async () => {
  // Voice mode is available with Anthropic OAuth OR a Whisper endpoint.
  // No hard Anthropic-only gate in NeoCode.
  if (!isVoiceModeEnabled()) {
    return {
      type: 'text' as const,
      value:
        'Voice mode requires either a Claude.ai account (/login) or a Whisper-compatible STT endpoint (set WHISPER_BASE_URL or whisperBaseUrl in settings).',
    }
  }

  const currentSettings = getInitialSettings()
  const isCurrentlyEnabled = currentSettings.voiceEnabled === true

  // Toggle OFF — no checks needed
  if (isCurrentlyEnabled) {
    const result = updateSettingsForSource('userSettings', {
      voiceEnabled: false,
    })
    if (result.error) {
      return {
        type: 'text' as const,
        value:
          'Failed to update settings. Check your settings file for syntax errors.',
      }
    }
    settingsChangeDetector.notifyChange('userSettings')
    logEvent('tengu_voice_toggled', { enabled: false })
    return {
      type: 'text' as const,
      value: 'Voice mode disabled.',
    }
  }

  // Toggle ON — run pre-flight checks first
  const { isWindowsSpeechAvailable } = await import(
    '../../services/windowsSpeechRecognition.js'
  )

  // Windows: System.Speech handles recording + STT natively — skip all
  // dependency checks (no SoX, no native module, no OAuth needed).
  if (!isWindowsSpeechAvailable()) {
    const { isVoiceStreamAvailable } = await import(
      '../../services/voiceStreamSTT.js'
    )
    const { checkRecordingAvailability } = await import('../../services/voice.js')

    // Check recording availability (microphone access)
    const recording = await checkRecordingAvailability()
    if (!recording.available) {
      return {
        type: 'text' as const,
        value:
          recording.reason ?? 'Voice mode is not available in this environment.',
      }
    }

    // Check for STT backend — Anthropic voice_stream OR custom Whisper endpoint
    const { hasWhisperEndpoint } = await import('../../voice/voiceModeEnabled.js')
    if (!isVoiceStreamAvailable() && !hasWhisperEndpoint()) {
      return {
        type: 'text' as const,
        value:
          'Voice mode needs a speech-to-text backend. Options:\n' +
          '  • Claude.ai account: run /login\n' +
          '  • Local Whisper: set WHISPER_BASE_URL=http://localhost:9000',
      }
    }

    // Check for recording tools
    const { checkVoiceDependencies, requestMicrophonePermission } =
      await import('../../services/voice.js')
    const deps = await checkVoiceDependencies()
    if (!deps.available) {
      const hint = deps.installCommand
        ? `\nInstall audio recording tools? Run: ${deps.installCommand}`
        : '\nInstall SoX manually for audio recording.'
      return {
        type: 'text' as const,
        value: `No audio recording tool found.${hint}`,
      }
    }

    // Probe mic access so the OS permission dialog fires now rather than
    // on the user's first hold-to-talk activation.
    if (!(await requestMicrophonePermission())) {
      const guidance =
        process.platform === 'linux'
          ? "your system's audio settings"
          : 'System Settings → Privacy & Security → Microphone'
      return {
        type: 'text' as const,
        value: `Microphone access is denied. To enable it, go to ${guidance}, then run /voice again.`,
      }
    }
  }

  // All checks passed — enable voice
  const result = updateSettingsForSource('userSettings', { voiceEnabled: true })
  if (result.error) {
    return {
      type: 'text' as const,
      value:
        'Failed to update settings. Check your settings file for syntax errors.',
    }
  }
  settingsChangeDetector.notifyChange('userSettings')
  logEvent('tengu_voice_toggled', { enabled: true })
  const key = getShortcutDisplay('voice:pushToTalk', 'Chat', 'Space')
  const stt = normalizeLanguageForSTT(currentSettings.language)
  const cfg = getGlobalConfig()
  // Reset the hint counter whenever the resolved STT language changes
  // (including first-ever enable, where lastLanguage is undefined).
  const langChanged = cfg.voiceLangHintLastLanguage !== stt.code
  const priorCount = langChanged ? 0 : (cfg.voiceLangHintShownCount ?? 0)
  const showHint = !stt.fellBackFrom && priorCount < LANG_HINT_MAX_SHOWS
  let langNote = ''
  if (stt.fellBackFrom) {
    langNote = ` Note: "${stt.fellBackFrom}" is not a supported dictation language; using English. Change it via /config.`
  } else if (showHint) {
    langNote = ` Dictation language: ${stt.code} (/config to change).`
  }
  if (langChanged || showHint) {
    saveGlobalConfig(prev => ({
      ...prev,
      voiceLangHintShownCount: priorCount + (showHint ? 1 : 0),
      voiceLangHintLastLanguage: stt.code,
    }))
  }
  return {
    type: 'text' as const,
    value: `Voice mode enabled. Hold ${key} to record.${langNote}`,
  }
}
