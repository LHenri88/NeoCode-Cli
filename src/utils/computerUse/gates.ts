/**
 * Computer Use feature gates for NeoCode.
 *
 * Replaces the original Anthropic subscription-tier gate (Max/Pro only)
 * with a simple opt-in flag. Any user with any provider can use Computer Use
 * when they explicitly enable it.
 *
 * Enable via:
 *   COMPUTER_USE_ENABLED=1  (env variable)
 *   or globalConfig.computerUseEnabled = true
 *   or --computer-use CLI flag
 */

import type { CoordinateMode, CuSubGates } from '@ant/computer-use-mcp/types'
import { getGlobalConfig } from '../config.js'
import { isEnvTruthy } from '../envUtils.js'

type ChicagoConfig = CuSubGates & {
  enabled: boolean
  coordinateMode: CoordinateMode
}

const DEFAULTS: ChicagoConfig = {
  enabled: false,
  pixelValidation: false,
  clipboardPasteMultiline: true,
  mouseAnimation: true,
  hideBeforeAction: true,
  autoTargetDisplay: true,
  clipboardGuard: true,
  coordinateMode: 'pixels',
}

function readConfig(): ChicagoConfig {
  const cfg = getGlobalConfig() as Record<string, unknown>
  const overrides: Partial<ChicagoConfig> = {}

  // Honor explicit globalConfig fields
  if (typeof cfg.computerUseEnabled === 'boolean') {
    overrides.enabled = cfg.computerUseEnabled
  }
  if (typeof cfg.computerUseCoordinateMode === 'string') {
    overrides.coordinateMode = cfg.computerUseCoordinateMode as CoordinateMode
  }

  return { ...DEFAULTS, ...overrides }
}

/**
 * Returns true when Computer Use is enabled.
 * No subscription check — NeoCode is open-source and provider-agnostic.
 */
export function getChicagoEnabled(): boolean {
  // Explicit env override (COMPUTER_USE_ENABLED=1)
  if (isEnvTruthy(process.env.COMPUTER_USE_ENABLED)) return true
  // --computer-use-mcp flag sets this env when launching the MCP server
  if (isEnvTruthy(process.env.CHICAGO_MCP)) return true
  return readConfig().enabled
}

export function getChicagoSubGates(): CuSubGates {
  const { enabled: _e, coordinateMode: _c, ...subGates } = readConfig()
  return subGates
}

// Frozen at first read so a mid-session config change doesn't de-sync
// the model's coordinate system expectation vs actual scaling.
let frozenCoordinateMode: CoordinateMode | undefined
export function getChicagoCoordinateMode(): CoordinateMode {
  frozenCoordinateMode ??= readConfig().coordinateMode
  return frozenCoordinateMode
}
