import type {
  ComputerUseHostAdapter,
  Logger,
} from '@ant/computer-use-mcp/types'
import { format } from 'util'
import { logForDebugging } from '../debug.js'
import { COMPUTER_USE_MCP_SERVER_NAME } from './common.js'
import { getChicagoEnabled, getChicagoSubGates } from './gates.js'

class DebugLogger implements Logger {
  silly(message: string, ...args: unknown[]): void {
    logForDebugging(format(message, ...args), { level: 'debug' })
  }
  debug(message: string, ...args: unknown[]): void {
    logForDebugging(format(message, ...args), { level: 'debug' })
  }
  info(message: string, ...args: unknown[]): void {
    logForDebugging(format(message, ...args), { level: 'info' })
  }
  warn(message: string, ...args: unknown[]): void {
    logForDebugging(format(message, ...args), { level: 'warn' })
  }
  error(message: string, ...args: unknown[]): void {
    logForDebugging(format(message, ...args), { level: 'error' })
  }
}

let cached: ComputerUseHostAdapter | undefined

/**
 * Process-lifetime singleton. On macOS uses the native Swift/Rust executor.
 * On Windows/Linux uses the cross-platform fallback (screenshot + xdotool).
 */
export function getComputerUseHostAdapter(): ComputerUseHostAdapter {
  if (cached) return cached

  let executor: import('@ant/computer-use-mcp/types').ComputerExecutor
  let ensureOsPermissions: ComputerUseHostAdapter['ensureOsPermissions']

  if (process.platform === 'darwin') {
    // macOS: full native executor with Swift/Rust NAPI modules
    const { createCliExecutor } = require('./executor.js') as typeof import('./executor.js')
    const { requireComputerUseSwift } = require('./swiftLoader.js') as typeof import('./swiftLoader.js')
    executor = createCliExecutor({
      getMouseAnimationEnabled: () => getChicagoSubGates().mouseAnimation,
      getHideBeforeActionEnabled: () => getChicagoSubGates().hideBeforeAction,
    })
    ensureOsPermissions = async () => {
      const cu = requireComputerUseSwift()
      const accessibility = (cu as any).tcc.checkAccessibility()
      const screenRecording = (cu as any).tcc.checkScreenRecording()
      return accessibility && screenRecording
        ? { granted: true }
        : { granted: false, accessibility, screenRecording }
    }
  } else {
    // Windows / Linux: cross-platform fallback (screenshot + xdotool on Linux)
    const { createCrossPlatformExecutor } = require('./crossPlatform.js') as typeof import('./crossPlatform.js')
    executor = createCrossPlatformExecutor()
    ensureOsPermissions = async () => ({ granted: true })
  }

  cached = {
    serverName: COMPUTER_USE_MCP_SERVER_NAME,
    logger: new DebugLogger(),
    executor,
    ensureOsPermissions,
    isDisabled: () => !getChicagoEnabled(),
    getSubGates: getChicagoSubGates,
    getAutoUnhideEnabled: () => true,
    // Pixel-validation: sync crop not implemented; returning null skips it.
    cropRawPatch: () => null,
  }
  return cached
}
