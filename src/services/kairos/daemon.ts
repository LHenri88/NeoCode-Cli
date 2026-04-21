// E12.2 — KAIROS Daemon
//
// Manages the KAIROS background process: spawn, stop, health-monitor,
// auto-restart on failure.

import { spawn, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import { logForDebugging } from '../../utils/debug.js'
import { loadKairosConfig, type KairosConfig } from './config.js'
import { recordKairosMetric } from './metrics.js'

type DaemonState = {
  process: ChildProcess | null
  restartCount: number
  pingInterval: ReturnType<typeof setInterval> | null
  config: KairosConfig
  cwd: string
}

const state: DaemonState = {
  process: null,
  restartCount: 0,
  pingInterval: null,
  config: {} as KairosConfig,
  cwd: process.cwd(),
}

/** Spawns the KAIROS daemon process. No-op if already running. */
export async function spawnKairosDaemon(cwd: string): Promise<void> {
  const config = loadKairosConfig(cwd)
  if (!config.enabled) {
    logForDebugging('[kairos] disabled in config')
    return
  }
  if (state.process && !state.process.killed) {
    logForDebugging('[kairos] already running')
    return
  }

  state.config = config
  state.cwd = cwd

  const scriptPath = join(cwd, config.scriptPath)
  logForDebugging(`[kairos] spawning daemon: ${scriptPath}`)

  try {
    const child = spawn(process.execPath, [scriptPath], {
      cwd,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      // Windows requires shell:true for .js scripts unless invoked via node
      ...(process.platform === 'win32' ? { shell: false } : {}),
    })

    child.stdout?.on('data', (data: Buffer) => {
      logForDebugging(`[kairos:daemon] ${data.toString().trim()}`)
    })
    child.stderr?.on('data', (data: Buffer) => {
      logForDebugging(`[kairos:daemon:err] ${data.toString().trim()}`)
    })
    child.on('exit', (code, signal) => {
      logForDebugging(`[kairos] daemon exited: code=${code} signal=${signal}`)
      state.process = null
      void handleDaemonExit(code, signal)
    })

    state.process = child
    void recordKairosMetric({ ts: new Date().toISOString(), event: 'start', pid: child.pid })

    // Start health monitor
    startHealthMonitor()
  } catch (e: unknown) {
    logForDebugging(`[kairos] spawn failed: ${(e as Error).message}`)
  }
}

/** Stops the KAIROS daemon gracefully. */
export async function stopKairosDaemon(): Promise<void> {
  stopHealthMonitor()
  if (!state.process) return
  const pid = state.process.pid
  try {
    state.process.kill('SIGTERM')
    await new Promise<void>(resolve => setTimeout(resolve, 1000))
    if (state.process && !state.process.killed) {
      state.process.kill('SIGKILL')
    }
  } catch {
    // Ignore
  }
  state.process = null
  void recordKairosMetric({ ts: new Date().toISOString(), event: 'stop', pid })
  logForDebugging('[kairos] daemon stopped')
}

/** Sends a ping to the daemon to verify it is alive. */
export async function pingDaemon(): Promise<boolean> {
  if (!state.process || state.process.killed) return false
  // Node child_process: we check exitCode as a proxy for liveness.
  const alive = state.process.exitCode === null && !state.process.killed
  logForDebugging(`[kairos] ping: ${alive ? 'alive' : 'dead'}`)
  return alive
}

// E12.4 — Health Monitor
function startHealthMonitor(): void {
  if (state.pingInterval) return
  const intervalMs = state.config.pingIntervalSec * 1000
  state.pingInterval = setInterval(async () => {
    const alive = await pingDaemon()
    if (alive) {
      void recordKairosMetric({
        ts: new Date().toISOString(),
        event: 'ping',
        pid: state.process?.pid,
      })
    } else {
      void recordKairosMetric({
        ts: new Date().toISOString(),
        event: 'ping_failed',
      })
      logForDebugging('[kairos] ping failed — daemon may be down')
    }
  }, intervalMs)
}

function stopHealthMonitor(): void {
  if (state.pingInterval) {
    clearInterval(state.pingInterval)
    state.pingInterval = null
  }
}

async function handleDaemonExit(
  _code: number | null,
  _signal: string | null,
): Promise<void> {
  if (state.restartCount >= state.config.maxRestarts) {
    logForDebugging(
      `[kairos] max restarts (${state.config.maxRestarts}) reached — giving up`,
    )
    stopHealthMonitor()
    return
  }
  state.restartCount++
  void recordKairosMetric({
    ts: new Date().toISOString(),
    event: 'restart',
    restartCount: state.restartCount,
  })
  logForDebugging(
    `[kairos] restarting daemon (attempt ${state.restartCount}/${state.config.maxRestarts})`,
  )
  await new Promise<void>(resolve => setTimeout(resolve, 2000))
  await spawnKairosDaemon(state.cwd)
}

/** Returns whether the daemon is currently running. */
export function isKairosDaemonRunning(): boolean {
  return !!(state.process && !state.process.killed && state.process.exitCode === null)
}
