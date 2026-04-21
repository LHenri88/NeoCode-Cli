/**
 * IDE detector for Web Preview feature.
 * Detects VS Code, Cursor, Windsurf, and other IDE variants via environment
 * variables, process ancestry, and config files.
 */

import { existsSync } from 'fs'
import { join } from 'path'
import { getCwd } from '../../utils/cwd.js'

export type IDEKind =
  | 'vscode'
  | 'cursor'
  | 'windsurf'
  | 'continue'
  | 'antigravity'
  | 'unknown'

export interface IDEInfo {
  kind: IDEKind
  /** Human-readable name */
  name: string
  /** Integrated terminal is available */
  hasIntegratedTerminal: boolean
  /** Port the IDE's built-in preview server uses (if any) */
  builtinPreviewPort?: number
  /** Whether to prefer the IDE terminal over an external process */
  preferIntegratedTerminal: boolean
}

/**
 * Inspects the current process environment to determine which IDE (if any)
 * the user is running inside. Order of checks matters — more specific first.
 */
export function detectIDE(): IDEInfo {
  const env = process.env

  // Antigravity: check BEFORE generic VS Code (Antigravity uses vscode env vars)
  // Check for ANTIGRAVITY_* env vars, .antigravity config, or antigravity in process path
  const cwd = getCwd()
  if (
    env.ANTIGRAVITY_SESSION_ID ||
    env.ANTIGRAVITY_WORKSPACE ||
    env.ANTIGRAVITY_VERSION ||
    existsSync(join(cwd, '.antigravity')) ||
    existsSync(join(cwd, '.antigravity.json')) ||
    env.VSCODE_GIT_ASKPASS_MAIN?.toLowerCase().includes('antigravity') ||
    env.TERM_PROGRAM_VERSION?.toLowerCase().includes('antigravity')
  ) {
    return {
      kind: 'antigravity',
      name: 'Antigravity',
      hasIntegratedTerminal: true,
      preferIntegratedTerminal: true,
    }
  }

  // Cursor: sets CURSOR_TRACE_ID or has vscode-like vars + cursor in the path
  if (
    env.CURSOR_TRACE_ID ||
    env.VSCODE_GIT_ASKPASS_MAIN?.toLowerCase().includes('cursor') ||
    env.TERM_PROGRAM === 'vscode' && env.CURSOR_CHANNEL
  ) {
    return {
      kind: 'cursor',
      name: 'Cursor',
      hasIntegratedTerminal: true,
      preferIntegratedTerminal: true,
    }
  }

  // Windsurf: sets WINDSURF_EXTENSION_ID or CODEIUM_* vars
  if (env.WINDSURF_EXTENSION_ID || env.CODEIUM_API_KEY || env.WINDSURF_SESSION_ID) {
    return {
      kind: 'windsurf',
      name: 'Windsurf',
      hasIntegratedTerminal: true,
      preferIntegratedTerminal: true,
    }
  }

  // VS Code family: TERM_PROGRAM=vscode or VSCODE_* env vars (generic fallback)
  if (
    env.TERM_PROGRAM === 'vscode' ||
    env.VSCODE_GIT_ASKPASS_MAIN ||
    env.VSCODE_IPC_HOOK_CLI ||
    env.VSCODE_INJECTION
  ) {
    return {
      kind: 'vscode',
      name: 'VS Code',
      hasIntegratedTerminal: true,
      preferIntegratedTerminal: true,
    }
  }

  // Continue.dev: sets CONTINUE_* env vars
  if (env.CONTINUE_WORKSPACE_DIRECTORY || env.CONTINUE_SERVER_URL) {
    return {
      kind: 'continue',
      name: 'Continue.dev',
      hasIntegratedTerminal: false,
      preferIntegratedTerminal: false,
    }
  }

  return {
    kind: 'unknown',
    name: 'Terminal',
    hasIntegratedTerminal: false,
    preferIntegratedTerminal: false,
  }
}
