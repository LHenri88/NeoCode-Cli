// E12.5 — KAIROS Metrics
//
// Appends structured metrics to ~/.neocode/kairos-metrics.json (JSONL).

import { appendFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { logForDebugging } from '../../utils/debug.js'

export type KairosEvent = 'start' | 'stop' | 'restart' | 'ping' | 'ping_failed' | 'self_improve'

export type KairosMetricEntry = {
  ts: string
  event: KairosEvent
  pid?: number
  restartCount?: number
  detail?: string
}

function getMetricsPath(): string {
  return join(homedir(), '.neocode', 'kairos-metrics.json')
}

/** Appends a JSONL metric entry. Fire-and-forget. */
export async function recordKairosMetric(entry: KairosMetricEntry): Promise<void> {
  try {
    await mkdir(join(homedir(), '.neocode'), { recursive: true })
    await appendFile(
      getMetricsPath(),
      JSON.stringify({ ...entry, ts: entry.ts ?? new Date().toISOString() }) + '\n',
      'utf8',
    )
  } catch (e: unknown) {
    logForDebugging(`[kairos:metrics] write failed: ${(e as Error).message}`)
  }
}
