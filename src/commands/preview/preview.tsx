/**
 * /preview command — thin wrapper around the WebPreviewTool + DevServerManager.
 *
 * Sub-commands:
 *   /preview on        → start dev server and open browser
 *   /preview off       → stop dev server
 *   /preview status    → show current state
 *   /preview open      → open browser (server must already be running)
 */

import React from 'react'
import { getCwd } from '../../utils/cwd.js'
import { detectFramework } from '../../services/webPreview/frameworkDetector.js'
import { detectIDE } from '../../services/webPreview/ideDetector.js'
import { devServerManager } from '../../services/webPreview/DevServerManager.js'
import type {
  LocalJSXCommandCall,
  LocalJSXCommandOnDone,
} from '../../types/command.js'

// ─── Formatters ───────────────────────────────────────────────────────────────

function renderHelp(): string {
  return `Usage: /preview [on|off|status|open]

Manage the web development preview server.

Sub-commands:
  /preview on      Detect the framework, start the dev server, and open the browser
  /preview off     Stop the running dev server
  /preview status  Show current server status, port, and recent logs
  /preview open    Open the preview URL in the default browser

The dev server command and port are auto-detected from package.json.
Override them via the WebPreview MCP tool if needed.`
}

function formatStatus(): string {
  const state = devServerManager.getState()
  const lines: string[] = []

  lines.push(`Status:     ${state.status.toUpperCase()}`)
  lines.push(`Framework:  ${state.framework || 'unknown'}`)
  lines.push(`URL:        ${state.url}`)
  lines.push(`IDE:        ${state.ide || 'unknown'}`)
  lines.push(`Command:    ${state.devCommand || 'none'}`)

  if (state.pid) {
    lines.push(`PID:        ${state.pid}`)
  }

  if (state.startedAt) {
    const elapsed = Math.round((Date.now() - state.startedAt.getTime()) / 1000)
    lines.push(`Uptime:     ${elapsed}s`)
  }

  if (state.lastError) {
    lines.push(``)
    lines.push(`Last error: ${state.lastError}`)
  }

  const logs = state.recentLogs.slice(-8)
  if (logs.length > 0) {
    lines.push(``)
    lines.push(`Recent logs:`)
    for (const line of logs) {
      lines.push(`  ${line}`)
    }
  }

  return lines.join('\n')
}

// ─── Command handler ──────────────────────────────────────────────────────────

async function runPreviewCommand(
  onDone: LocalJSXCommandOnDone,
  args: string,
): Promise<void> {
  const sub = args.trim().toLowerCase()

  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    onDone(renderHelp(), { display: 'system' })
    return
  }

  if (sub === 'status') {
    onDone(formatStatus(), { display: 'system' })
    return
  }

  if (sub === 'off' || sub === 'stop') {
    const result = devServerManager.stop()
    onDone(result.message, { display: 'system' })
    return
  }

  if (sub === 'open') {
    const result = devServerManager.openBrowser()
    onDone(result.message, { display: 'system' })
    return
  }

  if (sub === 'on' || sub === 'start') {
    if (devServerManager.isRunning()) {
      const state = devServerManager.getState()
      onDone(
        `Dev server is already running at ${state.url}\n\nUse /preview status for details or /preview off to stop it.`,
        { display: 'system' },
      )
      return
    }

    const cwd = getCwd()
    const framework = detectFramework(cwd)
    const ide = detectIDE()

    onDone(
      `Starting ${framework.name} dev server...\n` +
        `Command: ${framework.devCommand}\n` +
        `Port:    ${framework.defaultPort}\n` +
        `IDE:     ${ide.name}\n` +
        `\nPlease wait — the server will open in your browser once ready.`,
      { display: 'system' },
    )

    const result = await devServerManager.start({
      cwd,
      devCommand: framework.devCommand,
      port: framework.defaultPort,
      portEnvVar: framework.portEnvVar,
      framework: framework.name,
      ide: ide.name,
      openBrowser: true,
    })

    onDone(result.message, { display: 'system' })
    return
  }

  onDone(
    `Unknown sub-command: "${args.trim()}"\n\n${renderHelp()}`,
    { display: 'system' },
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const call: LocalJSXCommandCall = async (
  onDone,
  _context,
  args,
): Promise<React.ReactNode> => {
  await runPreviewCommand(onDone, args ?? '')
  return null
}
