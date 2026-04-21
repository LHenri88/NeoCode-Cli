/**
 * Whisper-compatible Speech-to-Text client for NeoCode.
 *
 * Works with any server that implements the OpenAI audio transcription API:
 *   POST /v1/audio/transcriptions
 *
 * Compatible providers:
 *   - OpenAI (WHISPER_BASE_URL=https://api.openai.com)
 *   - Local whisper.cpp server (WHISPER_BASE_URL=http://localhost:9000)
 *   - faster-whisper / whisper-server (WHISPER_BASE_URL=http://localhost:8000)
 *   - Groq (WHISPER_BASE_URL=https://api.groq.com/openai)
 *
 * Config (in priority order):
 *   1. WHISPER_BASE_URL env variable
 *   2. globalConfig.whisperBaseUrl setting
 *   3. Falls back to Anthropic voice_stream when the user has OAuth
 */

import { getGlobalConfig } from '../utils/config.js'
import { logForDebugging } from '../utils/debug.js'
import { logError } from '../utils/log.js'

export type WhisperTranscribeOptions = {
  language?: string
  model?: string
}

export type WhisperTranscribeResult = {
  text: string
}

/** Returns the configured Whisper base URL, or null if not set. */
export function getWhisperBaseUrl(): string | null {
  if (process.env.WHISPER_BASE_URL) return process.env.WHISPER_BASE_URL.replace(/\/$/, '')
  const cfg = getGlobalConfig() as Record<string, unknown>
  if (typeof cfg.whisperBaseUrl === 'string' && cfg.whisperBaseUrl) {
    return cfg.whisperBaseUrl.replace(/\/$/, '')
  }
  return null
}

/** Returns the API key to use with the Whisper endpoint. */
function getWhisperApiKey(): string {
  return (
    process.env.WHISPER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    'neocode'  // local servers typically accept any value
  )
}

/**
 * Transcribes a PCM audio buffer using the configured Whisper endpoint.
 *
 * @param audioBuffer - Raw 16kHz mono 16-bit PCM audio
 * @param options - Optional language hint and model name
 * @returns Transcribed text, or null on failure
 */
export async function transcribeWithWhisper(
  audioBuffer: Buffer,
  options: WhisperTranscribeOptions = {},
): Promise<string | null> {
  const baseUrl = getWhisperBaseUrl()
  if (!baseUrl) {
    logForDebugging('[whisper] No WHISPER_BASE_URL configured')
    return null
  }

  const endpoint = `${baseUrl}/v1/audio/transcriptions`
  const model = options.model || process.env.WHISPER_MODEL || 'whisper-1'

  // Build multipart/form-data manually — no FormData polyfill needed in Bun/Node 18+
  const boundary = `----WhisperBoundary${Date.now().toString(36)}`

  // Wrap raw PCM in a minimal WAV container (44-byte header)
  const wavBuffer = pcmToWav(audioBuffer, 16000, 1, 16)

  const parts: Buffer[] = []

  const addField = (name: string, value: string) => {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      ),
    )
  }

  addField('model', model)
  if (options.language) addField('language', options.language)
  addField('response_format', 'json')

  // Audio file part
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
    ),
  )
  parts.push(wavBuffer)
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))

  const body = Buffer.concat(parts)

  logForDebugging(`[whisper] POST ${endpoint} model=${model} bytes=${String(body.length)}`)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getWhisperApiKey()}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
      body,
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const err = await response.text()
      logForDebugging(`[whisper] HTTP ${String(response.status)}: ${err}`)
      return null
    }

    const json = (await response.json()) as { text?: string }
    const text = json.text?.trim() ?? ''
    logForDebugging(`[whisper] transcript: "${text}"`)
    return text || null
  } catch (e: unknown) {
    logError(e as Error)
    logForDebugging(`[whisper] request failed: ${(e as Error).message}`)
    return null
  }
}

// ── WAV header builder ────────────────────────────────────────────────────────

/**
 * Wraps raw PCM samples in a minimal RIFF/WAV container so standard
 * HTTP multipart uploads are accepted by Whisper servers.
 */
function pcmToWav(pcm: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8
  const blockAlign = (channels * bitsPerSample) / 8
  const dataSize = pcm.length
  const header = Buffer.alloc(44)

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)       // PCM chunk size
  header.writeUInt16LE(1, 20)        // PCM format
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, pcm])
}
