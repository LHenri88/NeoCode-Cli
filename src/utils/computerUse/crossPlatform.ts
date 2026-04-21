/**
 * Cross-platform Computer Use fallback for NeoCode.
 *
 * On macOS the full native executor (executor.ts + Swift/Rust modules) is used.
 * On Windows and Linux this module provides:
 *   - Screenshot via PowerShell (Win) / scrot/gnome-screenshot (Linux)
 *   - Clipboard read/write via PowerShell / xclip
 *   - Mouse/keyboard via child_process xdotool (Linux) or nircmd (Win) when available
 *
 * This covers the most common Computer Use patterns (screenshot + inspect) even
 * without native NAPI modules.
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFile, unlink } from 'node:fs/promises'
import type { ComputerExecutor, DisplayGeometry, ScreenshotResult } from '@ant/computer-use-mcp/types'
import { logForDebugging } from '../debug.js'

const execFileAsync = promisify(execFile)

// ── Screenshot ────────────────────────────────────────────────────────────────

async function captureScreenshotWindows(): Promise<Buffer> {
  const tmpPath = join(tmpdir(), `neocode-cu-${Date.now()}.png`)
  await execFileAsync('powershell', [
    '-NoProfile',
    '-Command',
    `Add-Type -AssemblyName System.Windows.Forms,System.Drawing; ` +
    `$b=[System.Drawing.Rectangle]::FromLTRB(0,0,[System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width,[System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); ` +
    `$bmp=New-Object System.Drawing.Bitmap($b.Width,$b.Height); ` +
    `$g=[System.Drawing.Graphics]::FromImage($bmp); ` +
    `$g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); ` +
    `$bmp.Save('${tmpPath.replace(/\\/g, '\\\\')}'); ` +
    `$g.Dispose(); $bmp.Dispose()`,
  ])
  const buf = await readFile(tmpPath)
  await unlink(tmpPath).catch(() => {})
  return buf
}

async function captureScreenshotLinux(): Promise<Buffer> {
  const tmpPath = join(tmpdir(), `neocode-cu-${Date.now()}.png`)
  // Try scrot, then gnome-screenshot, then import (ImageMagick)
  for (const [cmd, args] of [
    ['scrot', [tmpPath]],
    ['gnome-screenshot', ['-f', tmpPath]],
    ['import', ['-window', 'root', tmpPath]],
  ] as [string, string[]][]) {
    try {
      await execFileAsync(cmd, args, { timeout: 10_000 })
      const buf = await readFile(tmpPath)
      await unlink(tmpPath).catch(() => {})
      return buf
    } catch {
      // Try next
    }
  }
  throw new Error('No screenshot tool found. Install scrot: apt install scrot')
}

// ── Clipboard ────────────────────────────────────────────────────────────────

async function readClipboardWindows(): Promise<string> {
  const { stdout } = await execFileAsync('powershell', [
    '-NoProfile', '-Command', 'Get-Clipboard',
  ])
  return stdout.trimEnd()
}

async function writeClipboardWindows(text: string): Promise<void> {
  await execFileAsync('powershell', [
    '-NoProfile', '-Command', `Set-Clipboard -Value '${text.replace(/'/g, "''")}'`,
  ])
}

async function readClipboardLinux(): Promise<string> {
  for (const [cmd, args] of [['xclip', ['-selection', 'clipboard', '-o']], ['xsel', ['--clipboard', '--output']]] as [string, string[]][]) {
    try {
      const { stdout } = await execFileAsync(cmd, args)
      return stdout
    } catch { /* try next */ }
  }
  return ''
}

async function writeClipboardLinux(text: string): Promise<void> {
  for (const [cmd, args] of [['xclip', ['-selection', 'clipboard']], ['xsel', ['--clipboard', '--input']]] as [string, string[]][]) {
    try {
      await execFileAsync(cmd, args, { input: text } as Parameters<typeof execFileAsync>[2] & { input: string })
      return
    } catch { /* try next */ }
  }
}

// ── Mouse/keyboard via xdotool (Linux) or PowerShell (Windows) ──────────────

// Linux - xdotool
async function xdotoolClick(x: number, y: number, button = 1): Promise<void> {
  await execFileAsync('xdotool', ['mousemove', String(x), String(y)])
  await execFileAsync('xdotool', ['click', String(button)])
}

async function xdotoolType(text: string): Promise<void> {
  await execFileAsync('xdotool', ['type', '--delay', '0', '--', text])
}

async function xdotoolKey(sequence: string): Promise<void> {
  await execFileAsync('xdotool', ['key', sequence])
}

// Windows - PowerShell with SendInput API
async function windowsMoveMouse(x: number, y: number): Promise<void> {
  await execFileAsync('powershell', [
    '-NoProfile', '-Command',
    `Add-Type -AssemblyName System.Windows.Forms; ` +
    `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`
  ])
}

async function windowsClick(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
  const mouseEvent = button === 'right' ? 'RightClick' : button === 'middle' ? 'MiddleClick' : 'LeftClick'
  await execFileAsync('powershell', [
    '-NoProfile', '-Command',
    `Add-Type -AssemblyName System.Windows.Forms; ` +
    `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y}); ` +
    `$sig = '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);'; ` +
    `$type = Add-Type -MemberDefinition $sig -Name MouseEvent -Namespace Win32 -PassThru; ` +
    (button === 'right'
      ? `$type::mouse_event(0x08, 0, 0, 0, 0); $type::mouse_event(0x10, 0, 0, 0, 0)`
      : button === 'middle'
      ? `$type::mouse_event(0x20, 0, 0, 0, 0); $type::mouse_event(0x40, 0, 0, 0, 0)`
      : `$type::mouse_event(0x02, 0, 0, 0, 0); $type::mouse_event(0x04, 0, 0, 0, 0)`)
  ])
}

async function windowsSendKeys(text: string): Promise<void> {
  const escaped = text.replace(/[{}\[\]()^%~+]/g, '{$&}').replace(/\r?\n/g, '{ENTER}')
  await execFileAsync('powershell', [
    '-NoProfile', '-Command',
    `Add-Type -AssemblyName System.Windows.Forms; ` +
    `[System.Windows.Forms.SendKeys]::SendWait('${escaped.replace(/'/g, "''")}')`
  ])
}

async function windowsSendKey(key: string): Promise<void> {
  // Map common key names to SendKeys format
  const keyMap: Record<string, string> = {
    'Return': '{ENTER}',
    'Enter': '{ENTER}',
    'Tab': '{TAB}',
    'Escape': '{ESC}',
    'Backspace': '{BACKSPACE}',
    'Delete': '{DELETE}',
    'Home': '{HOME}',
    'End': '{END}',
    'PageUp': '{PGUP}',
    'PageDown': '{PGDN}',
    'Up': '{UP}',
    'Down': '{DOWN}',
    'Left': '{LEFT}',
    'Right': '{RIGHT}',
  }
  const mapped = keyMap[key] || key
  await execFileAsync('powershell', [
    '-NoProfile', '-Command',
    `Add-Type -AssemblyName System.Windows.Forms; ` +
    `[System.Windows.Forms.SendKeys]::SendWait('${mapped}')`
  ])
}

// ── Cross-platform executor factory ─────────────────────────────────────────

const STUB_DISPLAY: DisplayGeometry = {
  displayId: 0,
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  scaleFactor: 1,
  isPrimary: true,
}

const NOT_SUPPORTED = (name: string) => async () => {
  logForDebugging(`[computer-use:xplat] ${name} not supported on ${process.platform}`)
}

export function createCrossPlatformExecutor(): ComputerExecutor {
  const isWin = process.platform === 'win32'
  const isLinux = process.platform === 'linux'

  const captureScreen = isWin
    ? captureScreenshotWindows
    : isLinux
    ? captureScreenshotLinux
    : async () => { throw new Error('Unsupported platform') }

  const readClip = isWin ? readClipboardWindows : readClipboardLinux
  const writeClip = isWin ? writeClipboardWindows : writeClipboardLinux

  return {
    capabilities: {
      screenshot: true,
      clipboard: true,
      mouse: isLinux || isWin,   // xdotool on Linux; PowerShell on Windows
      keyboard: isLinux || isWin, // xdotool on Linux; SendKeys on Windows
    },

    async prepareForAction(): Promise<string[]> { return [] },
    async previewHideSet(): Promise<[]> { return [] },

    async getDisplaySize(): Promise<DisplayGeometry> {
      if (isWin) {
        try {
          const { stdout } = await execFileAsync('powershell', [
            '-NoProfile', '-Command',
            '[System.Windows.Forms.Screen]::PrimaryScreen | Select-Object -ExpandProperty Bounds | ForEach-Object { "$($_.Width)x$($_.Height)" }',
          ])
          const [w, h] = stdout.trim().split('x').map(Number)
          if (w && h) return { ...STUB_DISPLAY, width: w, height: h }
        } catch { /* fallthrough */ }
      }
      return STUB_DISPLAY
    },

    async listDisplays(): Promise<DisplayGeometry[]> { return [STUB_DISPLAY] },
    async findWindowDisplays(): Promise<[]> { return [] },

    async resolvePrepareCapture(): Promise<{ base64: string; width: number; height: number; hidden: string[] }> {
      const buf = await captureScreen()
      return { base64: buf.toString('base64'), width: STUB_DISPLAY.width, height: STUB_DISPLAY.height, hidden: [] }
    },

    async screenshot(): Promise<ScreenshotResult> {
      logForDebugging('[computer-use:xplat] taking screenshot')
      const buf = await captureScreen()
      return { base64: buf.toString('base64'), width: STUB_DISPLAY.width, height: STUB_DISPLAY.height }
    },

    async zoom(): Promise<{ base64: string; width: number; height: number }> {
      // Full-screen zoom fallback — crop not implemented cross-platform
      const buf = await captureScreen()
      return { base64: buf.toString('base64'), width: STUB_DISPLAY.width, height: STUB_DISPLAY.height }
    },

    async key(keySequence: string): Promise<void> {
      if (isLinux) {
        await xdotoolKey(keySequence.replace(/\+/g, '+'))
      } else if (isWin) {
        await windowsSendKey(keySequence)
      } else {
        return NOT_SUPPORTED('key')()
      }
    },

    async holdKey(keyNames: string[], durationMs: number): Promise<void> {
      if (isLinux) {
        await execFileAsync('xdotool', ['keydown', ...keyNames])
        await new Promise(r => setTimeout(r, durationMs))
        await execFileAsync('xdotool', ['keyup', ...keyNames])
      } else {
        return NOT_SUPPORTED('holdKey')()
      }
    },

    async type(text: string): Promise<void> {
      if (isLinux) {
        await xdotoolType(text)
      } else if (isWin) {
        await windowsSendKeys(text)
      } else {
        return NOT_SUPPORTED('type')()
      }
    },

    readClipboard: readClip,
    writeClipboard: writeClip,

    async moveMouse(x: number, y: number): Promise<void> {
      if (isLinux) {
        await execFileAsync('xdotool', ['mousemove', String(x), String(y)])
      } else if (isWin) {
        await windowsMoveMouse(x, y)
      } else {
        return NOT_SUPPORTED('moveMouse')()
      }
    },

    async click(x: number, y: number, button: 'left' | 'right' | 'middle', count: 1 | 2 | 3): Promise<void> {
      if (isLinux) {
        const btn = button === 'right' ? 3 : button === 'middle' ? 2 : 1
        for (let i = 0; i < count; i++) await xdotoolClick(x, y, btn)
      } else if (isWin) {
        for (let i = 0; i < count; i++) await windowsClick(x, y, button)
      } else {
        return NOT_SUPPORTED('click')()
      }
    },

    async mouseDown(): Promise<void> {
      if (isLinux) {
        await execFileAsync('xdotool', ['mousedown', '1'])
      } else {
        return NOT_SUPPORTED('mouseDown')()
      }
    },

    async mouseUp(): Promise<void> {
      if (isLinux) {
        await execFileAsync('xdotool', ['mouseup', '1'])
      } else {
        return NOT_SUPPORTED('mouseUp')()
      }
    },

    async getCursorPosition(): Promise<{ x: number; y: number }> {
      if (isLinux) {
        const { stdout } = await execFileAsync('xdotool', ['getmouselocation', '--shell'])
        const x = parseInt(stdout.match(/X=(\d+)/)?.[1] ?? '0')
        const y = parseInt(stdout.match(/Y=(\d+)/)?.[1] ?? '0')
        return { x, y }
      } else if (isWin) {
        const { stdout } = await execFileAsync('powershell', [
          '-NoProfile', '-Command',
          `Add-Type -AssemblyName System.Windows.Forms; ` +
          `$p = [System.Windows.Forms.Cursor]::Position; ` +
          `Write-Output "$($p.X),$($p.Y)"`
        ])
        const [x, y] = stdout.trim().split(',').map(Number)
        return { x: x || 0, y: y || 0 }
      }
      return { x: 0, y: 0 }
    },

    async drag(): Promise<void> { return NOT_SUPPORTED('drag')() },
    async scroll(): Promise<void> { return NOT_SUPPORTED('scroll')() },
    async getFrontmostApp(): Promise<null> { return null },
    async appUnderPoint(): Promise<null> { return null },
    async listInstalledApps(): Promise<[]> { return [] },
    async getAppIcon(): Promise<undefined> { return undefined },
    async listRunningApps(): Promise<[]> { return [] },
    async openApp(): Promise<void> { return NOT_SUPPORTED('openApp')() },
  }
}
