import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import React from 'react'
import { Box, Text } from '../../ink.js'
import type { DevServerState } from '../../services/webPreview/DevServerManager.js'
import type { WebPreviewAction, WebPreviewOutput } from './WebPreviewTool.js'

export function userFacingName(input: { action?: WebPreviewAction }): string {
  switch (input?.action) {
    case 'start':
      return 'Start Preview'
    case 'stop':
      return 'Stop Preview'
    case 'open_browser':
      return 'Open Browser'
    case 'status':
    default:
      return 'Preview Status'
  }
}

export function renderToolUseMessage(
  input: Partial<{ action: WebPreviewAction; port: number; command: string }>,
  _opts: { verbose: boolean },
): React.ReactNode {
  const action = input.action ?? 'status'
  const parts: string[] = [`action: "${action}"`]
  if (input.port) parts.push(`port: ${input.port}`)
  if (input.command) parts.push(`command: "${input.command}"`)
  return parts.join(', ')
}

export function renderToolUseErrorMessage(
  result: ToolResultBlockParam['content'],
  _opts: { verbose: boolean },
): React.ReactNode {
  const msg = typeof result === 'string' ? result : JSON.stringify(result)
  return (
    <Box>
      <Text color="red">Preview error: {msg}</Text>
    </Box>
  )
}

function StatusBadge({ status }: { status: DevServerState['status'] }) {
  const color =
    status === 'running' ? 'green'
    : status === 'starting' ? 'yellow'
    : status === 'error' ? 'red'
    : 'gray'
  return <Text color={color}>[{status.toUpperCase()}]</Text>
}

export function renderToolResultMessage(
  output: WebPreviewOutput,
  _progressMessages: unknown[],
  _opts: { verbose: boolean },
): React.ReactNode {
  if (!output.ok) {
    return (
      <Box flexDirection="column">
        <Text color="red">Preview: {output.message}</Text>
      </Box>
    )
  }

  const state = output.state
  if (!state) {
    return <Text color="green">{output.message}</Text>
  }

  return (
    <Box flexDirection="column" gap={0}>
      <Box gap={1}>
        <StatusBadge status={state.status} />
        <Text bold>{state.framework}</Text>
        {state.status === 'running' && (
          <Text color="cyan">{state.url}</Text>
        )}
      </Box>
      {state.ide !== 'unknown' && (
        <Text dimColor>IDE: {state.ide}</Text>
      )}
      {state.lastError && (
        <Box marginTop={1}>
          <Text color="red">Last error: {state.lastError}</Text>
        </Box>
      )}
      {output.logs && output.logs.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Recent logs:</Text>
          {output.logs.slice(-5).map((line, i) => (
            <Text key={i} dimColor>
              {line}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  )
}
