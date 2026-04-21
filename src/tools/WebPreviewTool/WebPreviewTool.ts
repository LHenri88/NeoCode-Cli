import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { detectFramework } from '../../services/webPreview/frameworkDetector.js'
import { detectIDE } from '../../services/webPreview/ideDetector.js'
import {
  devServerManager,
  type DevServerState,
} from '../../services/webPreview/DevServerManager.js'
import { DESCRIPTION, WEB_PREVIEW_TOOL_NAME } from './prompt.js'
import {
  renderToolResultMessage,
  renderToolUseErrorMessage,
  renderToolUseMessage,
  userFacingName,
} from './UI.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export type WebPreviewAction = 'start' | 'stop' | 'status' | 'open_browser'

export interface WebPreviewOutput {
  ok: boolean
  message: string
  state?: DevServerState
  logs?: string[]
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const inputSchema = lazySchema(() =>
  z.strictObject({
    action: z
      .enum(['start', 'stop', 'status', 'open_browser'])
      .describe(
        'Action to perform: "start" starts the dev server, "stop" kills it, ' +
          '"status" returns current state, "open_browser" opens the preview URL.',
      ),
    port: z
      .number()
      .int()
      .min(1024)
      .max(65535)
      .optional()
      .describe(
        'Override the port to use (default: auto-detected from framework, typically 3000 or 5173).',
      ),
    command: z
      .string()
      .optional()
      .describe(
        'Override the dev command to run (e.g., "npm run dev:local"). ' +
          'If omitted, the command is auto-detected from package.json.',
      ),
    open_browser: z
      .boolean()
      .optional()
      .describe(
        'When action is "start": whether to open the preview URL in the default browser. ' +
          'Defaults to true. The user will be asked for confirmation on the first open.',
      ),
  }),
)

type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    ok: z.boolean().describe('Whether the action succeeded'),
    message: z.string().describe('Human-readable result or error message'),
    state: z
      .object({
        status: z.enum(['idle', 'starting', 'running', 'error', 'stopped']),
        port: z.number(),
        url: z.string(),
        pid: z.number().optional(),
        framework: z.string(),
        devCommand: z.string(),
        ide: z.string(),
        recentLogs: z.array(z.string()),
        lastError: z.string().optional(),
        startedAt: z.date().optional(),
        browserOpened: z.boolean(),
      })
      .optional()
      .describe('Current dev server state (included in status and start responses)'),
    logs: z
      .array(z.string())
      .optional()
      .describe('Recent log lines from the dev server'),
  }),
)

type OutputSchema = ReturnType<typeof outputSchema>

// ─── Tool ────────────────────────────────────────────────────────────────────

export const WebPreviewTool = buildTool({
  name: WEB_PREVIEW_TOOL_NAME,
  searchHint: 'start dev server, web preview, browser, localhost, HMR',
  maxResultSizeChars: 10_000,

  async description() {
    return DESCRIPTION
  },

  get inputSchema(): InputSchema {
    return inputSchema()
  },

  get outputSchema(): OutputSchema {
    return outputSchema()
  },

  userFacingName,

  isConcurrencySafe() {
    return false
  },

  isReadOnly() {
    return false
  },

  toAutoClassifierInput(input) {
    return input.action
  },

  async prompt() {
    return DESCRIPTION
  },

  renderToolUseMessage,
  renderToolUseErrorMessage,
  renderToolResultMessage,

  async call(input): Promise<{ data: WebPreviewOutput }> {
    const cwd = getCwd()
    const ide = detectIDE()

    switch (input.action) {
      // ── START ──────────────────────────────────────────────────────────────
      case 'start': {
        if (devServerManager.isRunning()) {
          const state = devServerManager.getState()
          return {
            data: {
              ok: true,
              message: `Dev server is already running at ${state.url}`,
              state: state as DevServerState,
              logs: state.recentLogs,
            },
          }
        }

        const framework = detectFramework(cwd)
        const port = input.port ?? framework.defaultPort
        const command = input.command ?? framework.devCommand
        const shouldOpenBrowser = input.open_browser !== false

        const result = await devServerManager.start({
          cwd,
          devCommand: command,
          port,
          portEnvVar: framework.portEnvVar,
          framework: framework.name,
          ide: ide.name,
          openBrowser: shouldOpenBrowser,
        })

        const state = devServerManager.getState()
        return {
          data: {
            ok: result.ok,
            message: result.message,
            state: state as DevServerState,
            logs: state.recentLogs.slice(-20),
          },
        }
      }

      // ── STOP ───────────────────────────────────────────────────────────────
      case 'stop': {
        const result = devServerManager.stop()
        return {
          data: {
            ok: result.ok,
            message: result.message,
          },
        }
      }

      // ── STATUS ─────────────────────────────────────────────────────────────
      case 'status': {
        const state = devServerManager.getState()
        const running = devServerManager.isRunning()
        return {
          data: {
            ok: true,
            message: running
              ? `Dev server is ${state.status} at ${state.url} (${state.framework})`
              : 'No dev server is running.',
            state: state as DevServerState,
            logs: state.recentLogs.slice(-20),
          },
        }
      }

      // ── OPEN BROWSER ───────────────────────────────────────────────────────
      case 'open_browser': {
        const result = devServerManager.openBrowser()
        return {
          data: {
            ok: result.ok,
            message: result.message,
          },
        }
      }

      default: {
        return {
          data: {
            ok: false,
            message: `Unknown action: ${String(input.action)}`,
          },
        }
      }
    }
  },

  mapToolResultToToolResultBlockParam(output, toolUseID) {
    const lines: string[] = [output.message]

    if (output.state) {
      const s = output.state
      lines.push(`Status: ${s.status}`)
      if (s.status === 'running') {
        lines.push(`URL: ${s.url}`)
        lines.push(`Framework: ${s.framework}`)
        lines.push(`IDE: ${s.ide}`)
        lines.push(`Command: ${s.devCommand}`)
      }
      if (s.lastError) {
        lines.push(`Error: ${s.lastError}`)
      }
    }

    if (output.logs && output.logs.length > 0) {
      lines.push('', 'Recent logs:')
      lines.push(...output.logs.slice(-10))
    }

    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content: lines.join('\n'),
    }
  },
} satisfies ToolDef<InputSchema, WebPreviewOutput>)
