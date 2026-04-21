import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useInterval } from 'usehooks-ts'

import type { CommandResultDisplay } from '../../commands.js'
import { Markdown } from '../../components/Markdown.js'
import { SpinnerGlyph } from '../../components/Spinner/SpinnerGlyph.js'
import { DOWN_ARROW, UP_ARROW } from '../../constants/figures.js'
import { getSystemPrompt } from '../../constants/prompts.js'
import { useModalOrTerminalSize } from '../../context/modalContext.js'
import { getSystemContext, getUserContext } from '../../context.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import ScrollBox, { type ScrollBoxHandle } from '../../ink/components/ScrollBox.js'
import type { KeyboardEvent } from '../../ink/events/keyboard-event.js'
import { Box, Text } from '../../ink.js'
import { createBtwBufferEntry, appendBtwBufferEntry, listBtwBufferEntries } from '../../services/btw/buffer.js'
import type { LocalJSXCommandOnDone } from '../../types/command.js'
import type { Message } from '../../types/message.js'
import { createAbortController } from '../../utils/abortController.js'
import { saveGlobalConfig } from '../../utils/config.js'
import { errorMessage } from '../../utils/errors.js'
import {
  type CacheSafeParams,
  getLastCacheSafeParams,
} from '../../utils/forkedAgent.js'
import { getMessagesAfterCompactBoundary } from '../../utils/messages.js'
import type { ProcessUserInputContext } from '../../utils/processUserInput/processUserInput.js'
import { runSideQuestion } from '../../utils/sideQuestion.js'
import { asSystemPrompt } from '../../utils/systemPromptType.js'

type BtwComponentProps = {
  question: string
  context: ProcessUserInputContext
  onDone: (
    result?: string,
    options?: {
      display?: CommandResultDisplay
    },
  ) => void
}

const CHROME_ROWS = 5
const OUTER_CHROME_ROWS = 6
const SCROLL_LINES = 3

function stripInProgressAssistantMessage(messages: Message[]): Message[] {
  const last = messages.at(-1)
  if (last?.type === 'assistant' && last.message.stop_reason === null) {
    return messages.slice(0, -1)
  }
  return messages
}

async function buildCacheSafeParams(
  context: ProcessUserInputContext,
): Promise<CacheSafeParams> {
  const forkContextMessages = getMessagesAfterCompactBoundary(
    stripInProgressAssistantMessage(context.messages),
  )
  const saved = getLastCacheSafeParams()

  if (saved) {
    return {
      systemPrompt: saved.systemPrompt,
      userContext: saved.userContext,
      systemContext: saved.systemContext,
      toolUseContext: context,
      forkContextMessages,
    }
  }

  const [rawSystemPrompt, userContext, systemContext] = await Promise.all([
    getSystemPrompt(
      context.options.tools,
      context.options.mainLoopModel,
      [],
      context.options.mcpClients,
    ),
    getUserContext(),
    getSystemContext(),
  ])

  return {
    systemPrompt: asSystemPrompt(rawSystemPrompt),
    userContext,
    systemContext,
    toolUseContext: context,
    forkContextMessages,
  }
}

function formatBtwBuffer(): Promise<string> {
  return listBtwBufferEntries().then(entries => {
    if (entries.length === 0) {
      return 'No buffered BTW responses yet.'
    }

    return [
      `Buffered BTW responses (${entries.length}):`,
      '',
      ...entries.slice(0, 10).flatMap(entry => [
        `- ${entry.createdAt} · ${entry.question}`,
        `  ${entry.response.replace(/\s+/g, ' ').trim().slice(0, 240)}`,
      ]),
    ].join('\n')
  })
}

function BtwSideQuestion({
  question,
  context,
  onDone,
}: BtwComponentProps): React.ReactNode {
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [frame, setFrame] = useState(0)
  const scrollRef = useRef<ScrollBoxHandle>(null)
  const { rows } = useModalOrTerminalSize(useTerminalSize())

  useInterval(() => setFrame(current => current + 1), response || error ? null : 80)

  useEffect(() => {
    const abortController = createAbortController()

    async function fetchResponse(): Promise<void> {
      try {
        const cacheSafeParams = await buildCacheSafeParams(context)
        const result = await runSideQuestion({
          question,
          cacheSafeParams,
        })

        if (abortController.signal.aborted) {
          return
        }

        if (!result.response) {
          setError('No response received')
          return
        }

        setResponse(result.response)
        try {
          await appendBtwBufferEntry(
            createBtwBufferEntry(question, result.response),
          )
        } catch {
          // Buffering is best-effort and should not block the response UI.
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(errorMessage(err) || 'Failed to get response')
        }
      }
    }

    void fetchResponse()
    return () => {
      abortController.abort()
    }
  }, [context, question])

  function handleKeyDown(e: KeyboardEvent): void {
    if (
      e.key === 'escape' ||
      e.key === 'return' ||
      e.key === ' ' ||
      (e.ctrl && (e.key === 'c' || e.key === 'd'))
    ) {
      e.preventDefault()
      onDone(undefined, { display: 'skip' })
      return
    }

    if (e.key === 'up' || (e.ctrl && e.key === 'p')) {
      e.preventDefault()
      scrollRef.current?.scrollBy(-SCROLL_LINES)
      return
    }

    if (e.key === 'down' || (e.ctrl && e.key === 'n')) {
      e.preventDefault()
      scrollRef.current?.scrollBy(SCROLL_LINES)
    }
  }

  const maxContentHeight = Math.max(5, rows - CHROME_ROWS - OUTER_CHROME_ROWS)

  return (
    <Box
      flexDirection="column"
      paddingLeft={2}
      marginTop={1}
      tabIndex={0}
      autoFocus
      onKeyDown={handleKeyDown}
    >
      <Box>
        <Text color="warning" bold>
          /btw{' '}
        </Text>
        <Text dimColor>{question}</Text>
      </Box>

      <Box marginTop={1} marginLeft={2} maxHeight={maxContentHeight}>
        <ScrollBox ref={scrollRef} flexDirection="column" flexGrow={1}>
          {error ? (
            <Text color="error">{error}</Text>
          ) : response ? (
            <Markdown>{response}</Markdown>
          ) : (
            <Box>
              <SpinnerGlyph frame={frame} messageColor="warning" />
              <Text color="warning">Answering...</Text>
            </Box>
          )}
        </ScrollBox>
      </Box>

      {(response || error) && (
        <Box marginTop={1}>
          <Text dimColor>
            {UP_ARROW}/{DOWN_ARROW} to scroll · Space, Enter, or Escape to dismiss
          </Text>
        </Box>
      )}
    </Box>
  )
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: ProcessUserInputContext,
  args: string,
): Promise<React.ReactNode> {
  const question = args?.trim()

  if (question === 'list') {
    onDone(await formatBtwBuffer(), { display: 'system' })
    return null
  }

  if (!question) {
    onDone('Usage: /btw <your question> or /btw list', {
      display: 'system',
    })
    return null
  }

  saveGlobalConfig(current => ({
    ...current,
    btwUseCount: current.btwUseCount + 1,
  }))

  return <BtwSideQuestion question={question} context={context} onDone={onDone} />
}
