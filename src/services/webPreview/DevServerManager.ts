/**
 * DevServerManager — singleton that manages the lifecycle of a local dev server
 * spawned by the Web Preview feature.
 *
 * Responsibilities:
 *  - Spawn / kill the dev server process
 *  - Capture stdout / stderr in a ring buffer
 *  - Detect ready state (port listening) by scanning output
 *  - Open the default browser (with user confirmation gate)
 *  - Provide a snapshot of current state for tools and commands
 */

import { ChildProcess, spawn } from 'child_process'
import { platform } from 'os'
import net from 'net'

export type ServerStatus = 'idle' | 'starting' | 'running' | 'error' | 'stopped'

export interface DevServerState {
  status: ServerStatus
  port: number
  url: string
  pid?: number
  framework: string
  devCommand: string
  ide: string
  /** Last N lines of combined stdout/stderr */
  recentLogs: string[]
  /** Last error captured (build error, crash, etc.) */
  lastError?: string
  startedAt?: Date
  browserOpened: boolean
}

/** Ring buffer — keeps the last N lines without unbounded growth */
function makeLogBuffer(capacity = 200) {
  const buf: string[] = []
  return {
    push(line: string) {
      buf.push(line)
      if (buf.length > capacity) buf.shift()
    },
    snapshot(): string[] {
      return [...buf]
    },
    clear() {
      buf.length = 0
    },
  }
}

/** Try to parse the listening port from a log line produced by common frameworks */
function parsePortFromLine(line: string): number | null {
  // Vite:  "Local:   http://localhost:5173/"
  // Next:  "ready - started server on 0.0.0.0:3000"
  // CRA:   "Local:            http://localhost:3000"
  // Astro: "  http://localhost:4321/"
  const urlMatch = line.match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/)
  if (urlMatch) return parseInt(urlMatch[1]!, 10)

  // Generic "port NNNN" / "listening on :NNNN"
  const portMatch = line.match(/(?:port|:)\s*(\d{4,5})\b/)
  if (portMatch) return parseInt(portMatch[1]!, 10)

  return null
}

/** Error-pattern heuristics for common build errors */
function isErrorLine(line: string): boolean {
  const lower = line.toLowerCase()
  return (
    lower.includes('error:') ||
    lower.includes('failed to compile') ||
    lower.includes('build failed') ||
    lower.includes('uncaught error') ||
    lower.includes('typeerror') ||
    lower.includes('syntaxerror')
  )
}

/** Wait until `port` accepts a TCP connection or timeout expires */
async function waitForPort(port: number, timeoutMs = 30_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const open = await new Promise<boolean>(resolve => {
      const sock = net.createConnection({ port, host: '127.0.0.1' })
      sock.once('connect', () => { sock.destroy(); resolve(true) })
      sock.once('error', () => { sock.destroy(); resolve(false) })
    })
    if (open) return true
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

/** Open `url` in the system default browser, cross-platform */
function openBrowser(url: string): void {
  const os = platform()
  if (os === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref()
  } else if (os === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref()
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
  }
}

class DevServerManager {
  private proc: ChildProcess | null = null
  private logs = makeLogBuffer()
  private state: DevServerState = {
    status: 'idle',
    port: 3000,
    url: 'http://localhost:3000',
    framework: 'unknown',
    devCommand: '',
    ide: 'unknown',
    recentLogs: [],
    browserOpened: false,
  }

  getState(): Readonly<DevServerState> {
    return { ...this.state, recentLogs: this.logs.snapshot() }
  }

  isRunning(): boolean {
    return this.state.status === 'running' || this.state.status === 'starting'
  }

  /**
   * Start the dev server.
   *
   * @param opts.cwd         Working directory for the server process
   * @param opts.devCommand  Full shell command (e.g., "bun run dev")
   * @param opts.port        Expected port (used for ready-detection fallback)
   * @param opts.portEnvVar  Env var name used to override the port (optional)
   * @param opts.env         Extra environment variables to pass
   * @param opts.framework   Human-readable framework name (for status display)
   * @param opts.ide         IDE name (for status display)
   * @param opts.openBrowser Whether to open the browser once ready
   */
  async start(opts: {
    cwd: string
    devCommand: string
    port: number
    portEnvVar?: string
    env?: Record<string, string>
    framework: string
    ide: string
    openBrowser: boolean
  }): Promise<{ ok: boolean; message: string }> {
    if (this.isRunning()) {
      return { ok: false, message: 'Dev server is already running. Use /preview off to stop it first.' }
    }

    this.logs.clear()
    this.state = {
      status: 'starting',
      port: opts.port,
      url: `http://localhost:${opts.port}`,
      framework: opts.framework,
      devCommand: opts.devCommand,
      ide: opts.ide,
      recentLogs: [],
      browserOpened: false,
      startedAt: new Date(),
    }

    const extraEnv: Record<string, string> = {
      ...(opts.portEnvVar ? { [opts.portEnvVar]: String(opts.port) } : {}),
      ...opts.env,
      FORCE_COLOR: '0', // suppress ANSI codes in captured logs
    }

    // Split devCommand into argv[0] + args
    const parts = opts.devCommand.split(/\s+/)
    const cmd = parts[0]!
    const args = parts.slice(1)

    this.proc = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...extraEnv },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    this.state.pid = this.proc.pid

    // Capture stdout and detect ready port
    this.proc.stdout?.setEncoding('utf8')
    this.proc.stdout?.on('data', (chunk: string) => {
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue
        this.logs.push(line)

        // Auto-detect port from log output
        const detected = parsePortFromLine(line)
        if (detected && this.state.status === 'starting') {
          this.state.port = detected
          this.state.url = `http://localhost:${detected}`
        }
      }
    })

    this.proc.stderr?.setEncoding('utf8')
    this.proc.stderr?.on('data', (chunk: string) => {
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue
        this.logs.push(`[stderr] ${line}`)
        if (isErrorLine(line)) {
          this.state.lastError = line
        }
      }
    })

    this.proc.on('exit', (code, signal) => {
      this.state.status = code === 0 ? 'stopped' : 'error'
      if (code !== 0 && code !== null) {
        this.state.lastError = `Process exited with code ${code} (signal: ${signal ?? 'none'})`
      }
      this.proc = null
    })

    // Wait for the port to open (indicates server is ready)
    const ready = await waitForPort(this.state.port, 45_000)
    if (!ready) {
      // If the process already died, report error
      if (!this.proc) {
        return {
          ok: false,
          message: `Dev server failed to start. Last logs:\n${this.logs.snapshot().slice(-10).join('\n')}`,
        }
      }
      // Still running but port not responding — mark as error
      this.state.status = 'error'
      this.state.lastError = 'Timed out waiting for dev server to become ready'
      return { ok: false, message: this.state.lastError }
    }

    this.state.status = 'running'

    if (opts.openBrowser) {
      openBrowser(this.state.url)
      this.state.browserOpened = true
    }

    return { ok: true, message: `Dev server started at ${this.state.url}` }
  }

  /**
   * Stop the currently running dev server.
   */
  stop(): { ok: boolean; message: string } {
    if (!this.isRunning() || !this.proc) {
      this.state.status = 'idle'
      return { ok: true, message: 'No dev server is running.' }
    }

    try {
      // On Windows, use taskkill to kill the entire process tree
      if (platform() === 'win32' && this.proc.pid) {
        spawn('taskkill', ['/pid', String(this.proc.pid), '/f', '/t'], {
          stdio: 'ignore',
        })
      } else {
        this.proc.kill('SIGTERM')
      }
      this.state.status = 'stopped'
      this.proc = null
      return { ok: true, message: 'Dev server stopped.' }
    } catch (e) {
      return { ok: false, message: `Failed to stop dev server: ${String(e)}` }
    }
  }

  /**
   * Open the browser pointing at the running server URL.
   */
  openBrowser(): { ok: boolean; message: string } {
    if (this.state.status !== 'running') {
      return { ok: false, message: 'Dev server is not running. Use /preview on first.' }
    }
    openBrowser(this.state.url)
    this.state.browserOpened = true
    return { ok: true, message: `Opened ${this.state.url} in your default browser.` }
  }
}

// Module-level singleton — all tool calls share the same instance
export const devServerManager = new DevServerManager()
