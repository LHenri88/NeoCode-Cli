// E12.3 — KAIROS config via .neocode/kairos.yaml

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { logForDebugging } from '../../utils/debug.js'

export type KairosConfig = {
  enabled: boolean
  pingIntervalSec: number
  maxRestarts: number
  /** Path to KAIROS daemon script, relative to project root. */
  scriptPath: string
  /** Post-session self-improve enabled. */
  selfImprove: boolean
  /** Minimum session duration (seconds) before self-improve fires. */
  selfImproveMinSessionSec: number
}

export const KAIROS_DEFAULTS: KairosConfig = {
  enabled: false,
  pingIntervalSec: 30,
  maxRestarts: 3,
  scriptPath: '.neocode/kairos-daemon.js',
  selfImprove: true,
  selfImproveMinSessionSec: 60,
}

/** Loads .neocode/kairos.yaml from cwd. Returns defaults on error/absence. */
export function loadKairosConfig(cwd: string): KairosConfig {
  const candidates = [
    join(cwd, '.neocode', 'kairos.yaml'),
    join(cwd, '.neocode', 'kairos.yml'),
    join(cwd, '.claude', 'kairos.yaml'),
  ]

  for (const path of candidates) {
    try {
      const raw = readFileSync(path, 'utf8')
      const parsed = parseYaml(raw)
      if (!parsed || typeof parsed !== 'object') continue
      logForDebugging(`[kairos] config loaded from ${path}`)
      return {
        ...KAIROS_DEFAULTS,
        ...(parsed as Partial<KairosConfig>),
      }
    } catch {
      // File not found or parse error — try next candidate
    }
  }

  return { ...KAIROS_DEFAULTS }
}
