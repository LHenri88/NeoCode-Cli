// E10.5 — Dream Operation Log
//
// Appends JSONL entries to ~/.neocode/dream.log for observability.

import { appendFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { logForDebugging } from '../../utils/debug.js'

export type DreamTrigger = 'idle' | 'interval' | 'manual'

export type DreamLogEntry = {
  ts: string
  trigger: DreamTrigger
  durationMs: number
  sessionsReviewed: number
  memoriesFilesTouched: number
  sessionId: string
  error?: string
}

function getDreamLogPath(): string {
  return join(homedir(), '.neocode', 'dream.log')
}

/** Appends a single JSONL entry to ~/.neocode/dream.log. Fire-and-forget. */
export async function appendDreamLog(entry: DreamLogEntry): Promise<void> {
  try {
    const logPath = getDreamLogPath()
    await mkdir(join(homedir(), '.neocode'), { recursive: true })
    await appendFile(logPath, JSON.stringify(entry) + '\n', 'utf8')
  } catch (e: unknown) {
    logForDebugging(`[dreamLog] write failed: ${(e as Error).message}`)
  }
}
