// Leaf config module — intentionally minimal imports so UI components
// can read the auto-dream enabled state without dragging in the forked
// agent / task registry / message builder chain that autoDream.ts pulls in.

import { getInitialSettings } from '../../utils/settings/settings.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../analytics/growthbook.js'
import type { DreamTrigger } from './dreamLog.js'

/**
 * Whether background memory consolidation should run. User setting
 * (autoDreamEnabled in settings.json) overrides the GrowthBook default
 * when explicitly set; otherwise falls through to tengu_onyx_plover.
 */
export function isAutoDreamEnabled(): boolean {
  const setting = getInitialSettings().autoDreamEnabled
  if (setting !== undefined) return setting
  const gb = getFeatureValue_CACHED_MAY_BE_STALE<{ enabled?: unknown } | null>(
    'tengu_onyx_plover',
    null,
  )
  return gb?.enabled === true
}

// E10.4 — Configurable dream trigger
//
// dreamTrigger in settings.json: 'idle' | 'interval' | 'manual'
//   idle     — fires when time+session gates pass (original behaviour, default)
//   interval — fires every N hours regardless of session count
//   manual   — never fires automatically; user calls /dream explicitly
//
// dreamIntervalHours overrides minHours when trigger is 'interval'.

export function getDreamTrigger(): DreamTrigger {
  const settings = getInitialSettings() as Record<string, unknown>
  const raw = settings['dreamTrigger']
  if (raw === 'idle' || raw === 'interval' || raw === 'manual') return raw
  return 'idle'
}

export function getDreamIntervalHours(): number {
  const settings = getInitialSettings() as Record<string, unknown>
  const raw = settings['dreamIntervalHours']
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw
  return 24
}
