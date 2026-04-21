import { mkdir, writeFile } from 'node:fs/promises'
import * as React from 'react'

import type { CommandResultDisplay } from '../../commands.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { MemoryFileSelector } from '../../components/memory/MemoryFileSelector.js'
import { getRelativeMemoryPath } from '../../components/memory/MemoryUpdateNotification.js'
import { getAutoMemPath, isAutoMemoryEnabled } from '../../memdir/paths.js'
import { Box, Link, Text } from '../../ink.js'
import {
  buildMemoryPalaceGraphSummary,
  formatMemoryPalaceGraphSummary,
  searchMemoryPalace,
} from '../../services/memoryPalace/index.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { clearMemoryFileCaches, getMemoryFiles } from '../../utils/claudemd.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import { getErrnoCode } from '../../utils/errors.js'
import { logError } from '../../utils/log.js'
import { editFileInEditor } from '../../utils/promptEditor.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'

function formatSearchResults(
  query: string,
  results: Awaited<ReturnType<typeof searchMemoryPalace>>,
): string {
  if (results.length === 0) {
    return `No Memory Palace matches found for "${query}".`
  }

  return [
    `Memory Palace matches for "${query}":`,
    '',
    ...results.slice(0, 10).flatMap(result => [
      `- ${result.path} (${result.score} matches)`,
      `  ${result.excerpt}`,
    ]),
  ].join('\n')
}

async function handleMemorySubcommand(
  onDone: (
    result?: string,
    options?: {
      display?: CommandResultDisplay
    },
  ) => void,
  args: string,
): Promise<boolean> {
  const trimmed = args.trim()
  if (!trimmed) {
    return false
  }

  const [subcommand, ...rest] = trimmed.split(/\s+/)
  const remainder = rest.join(' ').trim()

  if (subcommand === 'palace') {
    if (remainder === 'on' || remainder === 'off') {
      const enabled = remainder === 'on'
      updateSettingsForSource('userSettings', {
        autoMemoryEnabled: enabled,
      })
      onDone(
        `Memory Palace ${enabled ? 'enabled' : 'disabled'}. Root: ${getAutoMemPath()}`,
        { display: 'system' },
      )
      return true
    }

    onDone(
      [
        `Memory Palace is ${isAutoMemoryEnabled() ? 'enabled' : 'disabled'}.`,
        `Root: ${getAutoMemPath()}`,
        'Usage: /memory palace <on|off>',
      ].join('\n'),
      { display: 'system' },
    )
    return true
  }

  if (subcommand === 'search') {
    if (!remainder) {
      onDone('Usage: /memory search <query>', { display: 'system' })
      return true
    }

    const results = await searchMemoryPalace(remainder)
    onDone(formatSearchResults(remainder, results), { display: 'system' })
    return true
  }

  if (subcommand === 'graph') {
    const summary = await buildMemoryPalaceGraphSummary()
    onDone(formatMemoryPalaceGraphSummary(summary), { display: 'system' })
    return true
  }

  onDone(
    'Usage: /memory, /memory palace <on|off>, /memory search <query>, or /memory graph',
    { display: 'system' },
  )
  return true
}

function MemoryCommand({
  onDone,
}: {
  onDone: (
    result?: string,
    options?: {
      display?: CommandResultDisplay
    },
  ) => void
}): React.ReactNode {
  const handleSelectMemoryFile = async (memoryPath: string) => {
    try {
      if (memoryPath.includes(getClaudeConfigHomeDir())) {
        await mkdir(getClaudeConfigHomeDir(), {
          recursive: true,
        })
      }

      try {
        await writeFile(memoryPath, '', {
          encoding: 'utf8',
          flag: 'wx',
        })
      } catch (error: unknown) {
        if (getErrnoCode(error) !== 'EEXIST') {
          throw error
        }
      }

      await editFileInEditor(memoryPath)

      const editorSource = process.env.VISUAL
        ? '$VISUAL'
        : process.env.EDITOR
          ? '$EDITOR'
          : 'default'
      const editorValue =
        editorSource === '$VISUAL'
          ? process.env.VISUAL
          : editorSource === '$EDITOR'
            ? process.env.EDITOR
            : ''
      const editorInfo =
        editorSource !== 'default'
          ? `Using ${editorSource}="${editorValue}".`
          : ''
      const editorHint = editorInfo
        ? `> ${editorInfo} To change editor, set $EDITOR or $VISUAL environment variable.`
        : '> To use a different editor, set the $EDITOR or $VISUAL environment variable.'

      onDone(
        `Opened memory file at ${getRelativeMemoryPath(memoryPath)}\n\n${editorHint}`,
        { display: 'system' },
      )
    } catch (error) {
      logError(error)
      onDone(`Error opening memory file: ${error}`)
    }
  }

  const handleCancel = () => {
    onDone('Cancelled memory editing', {
      display: 'system',
    })
  }

  return (
    <Dialog title="Memory" onCancel={handleCancel} color="remember">
      <Box flexDirection="column">
        <React.Suspense fallback={null}>
          <MemoryFileSelector
            onSelect={handleSelectMemoryFile}
            onCancel={handleCancel}
          />
        </React.Suspense>

        <Box marginTop={1}>
          <Text dimColor>
            Learn more: <Link url="https://code.claude.com/docs/en/memory" />
          </Text>
        </Box>
      </Box>
    </Dialog>
  )
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  if (await handleMemorySubcommand(onDone, args ?? '')) {
    return null
  }

  clearMemoryFileCaches()
  await getMemoryFiles()
  return <MemoryCommand onDone={onDone} />
}
