/**
 * Windows-native Speech-to-Text via PowerShell System.Speech.Recognition.
 *
 * Uses Windows built-in speech recognition — no API keys or external
 * services required. Works offline. Handles audio capture + transcription
 * internally (bypasses voice.ts recording pipeline).
 *
 * Protocol: PowerShell streams lines to stdout:
 *   READY          — recognition engine initialized, mic opened
 *   H:<text>       — hypothesis (interim, not finalized)
 *   F:<text>       — final recognized text
 * Stop: write "STOP\n" to stdin.
 */

import { type ChildProcess, spawn } from 'child_process'
import { logForDebugging } from '../utils/debug.js'
import { logError } from '../utils/log.js'

// PowerShell script: async recognition, streams hypotheses + finals via stdout.
const WIN_STT_SCRIPT = `
Add-Type -AssemblyName System.Speech
$recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
try {
  $recognizer.SetInputToDefaultAudioDevice()
} catch {
  [Console]::Error.WriteLine("NO_DEVICE:" + $_.Exception.Message)
  exit 1
}
$grammar = New-Object System.Speech.Recognition.DictationGrammar
$recognizer.LoadGrammar($grammar)
Register-ObjectEvent -InputObject $recognizer -EventName SpeechHypothesized -Action {
  $t = $EventArgs.Result.Text
  [Console]::Out.Write("H:" + $t + "\n")
  [Console]::Out.Flush()
} | Out-Null
Register-ObjectEvent -InputObject $recognizer -EventName SpeechRecognized -Action {
  $t = $EventArgs.Result.Text
  [Console]::Out.Write("F:" + $t + "\n")
  [Console]::Out.Flush()
} | Out-Null
[Console]::Out.Write("READY\n")
[Console]::Out.Flush()
$recognizer.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line -or $line -eq "STOP") { break }
}
$recognizer.RecognizeAsyncStop()
Start-Sleep -Milliseconds 300
$recognizer.Dispose()
`

export type WindowsSTTCallbacks = {
  onReady: () => void
  onHypothesis: (text: string) => void
  onFinal: (text: string) => void
  onError: (msg: string) => void
}

export type WindowsSTTSession = {
  /** Send STOP to the PowerShell process and kill after 400ms. */
  stop: () => void
  isActive: () => boolean
}

/** True only on Windows where System.Speech is available. */
export function isWindowsSpeechAvailable(): boolean {
  return process.platform === 'win32'
}

/**
 * Starts Windows Speech Recognition via PowerShell.
 * Returns a session handle or null if the process couldn't be spawned.
 */
export function startWindowsSpeechRecognition(
  callbacks: WindowsSTTCallbacks,
): WindowsSTTSession | null {
  if (!isWindowsSpeechAvailable()) return null

  let active = true
  let child: ChildProcess | null = null

  try {
    child = spawn(
      'powershell',
      ['-NonInteractive', '-NoProfile', '-Command', WIN_STT_SCRIPT],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
    )
  } catch (err) {
    logError(err as Error)
    return null
  }

  let buffer = ''

  child.stdout?.on('data', (chunk: Buffer) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      logForDebugging(`[win-stt] stdout: ${trimmed}`)
      if (trimmed === 'READY') {
        callbacks.onReady()
      } else if (trimmed.startsWith('H:')) {
        callbacks.onHypothesis(trimmed.slice(2))
      } else if (trimmed.startsWith('F:')) {
        callbacks.onFinal(trimmed.slice(2))
      }
    }
  })

  child.stderr?.on('data', (chunk: Buffer) => {
    const msg = chunk.toString().trim()
    logForDebugging(`[win-stt] stderr: ${msg}`)
    if (msg.startsWith('NO_DEVICE:')) {
      active = false
      callbacks.onError(
        'No audio input device found. Connect a microphone and try again.',
      )
    }
  })

  child.on('error', (err: Error) => {
    logError(err)
    active = false
    callbacks.onError(
      `Windows speech recognition failed to start: ${err.message}`,
    )
  })

  child.on('close', () => {
    active = false
  })

  return {
    stop(): void {
      if (!active || !child) return
      active = false
      try {
        child.stdin?.write('STOP\n')
        setTimeout(() => {
          try { child?.kill('SIGTERM') } catch { /* already dead */ }
        }, 400)
      } catch {
        try { child?.kill('SIGTERM') } catch { /* already dead */ }
      }
    },
    isActive(): boolean {
      return active
    },
  }
}
