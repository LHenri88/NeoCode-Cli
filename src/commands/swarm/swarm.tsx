/**
 * /swarm <epic> — launches a Matrix-style multi-agent swarm.
 *
 * Renders a live dashboard showing all agents, their status, inter-agent
 * messages, and streams the final synthesis back to the conversation.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Text } from '../../ink.js'
import type { CommandResultDisplay } from '../../commands.js'
import {
  type CacheSafeParams,
  getLastCacheSafeParams,
} from '../../utils/forkedAgent.js'
import { getSystemPrompt } from '../../constants/prompts.js'
import { getUserContext, getSystemContext } from '../../context.js'
import { getMessagesAfterCompactBoundary } from '../../utils/messages.js'
import { asSystemPrompt } from '../../utils/systemPromptType.js'
import type { ProcessUserInputContext } from '../../utils/processUserInput/processUserInput.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { runSwarm } from '../../services/agentSwarm/SwarmCoordinator.js'
import { getRoleDefinition } from '../../services/agentSwarm/agentRoles.js'
import type { SwarmState, SwarmAgent, SwarmMessage } from '../../services/agentSwarm/types.js'

// ── Colours (matrix green palette) ─────────────────────────────────────────
const C = {
  green:     '#00ff41',
  greenDim:  '#00cc33',
  greenDark: '#008f11',
  cyan:      '#00e5ff',
  yellow:    '#f3c969',
  red:       '#ff8a6c',
  white:     '#f7efe5',
  dim:       '#555555',
}

const STATUS_COLOUR: Record<string, string> = {
  idle:    C.dim,
  waiting: C.greenDark,
  running: C.cyan,
  done:    C.green,
  failed:  C.red,
}

const STATUS_ICON: Record<string, string> = {
  idle:    '○',
  waiting: '◌',
  running: '▶',
  done:    '✓',
  failed:  '✗',
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function AgentRow({ agent }: { agent: SwarmAgent }) {
  const colour = STATUS_COLOUR[agent.status] ?? C.dim
  const icon   = STATUS_ICON[agent.status]   ?? '·'
  const role   = getRoleDefinition(agent.role)
  const elapsed = agent.startedAt && agent.finishedAt
    ? `${((agent.finishedAt - agent.startedAt) / 1000).toFixed(1)}s`
    : agent.startedAt ? '…' : ''

  return (
    <Box>
      <Text color={colour}>{icon} </Text>
      <Text color={colour} bold>{agent.name.padEnd(16)}</Text>
      <Text color={C.dim}>{role.icon} {agent.role.padEnd(12)}</Text>
      {agent.status === 'running' && agent.thinking
        ? <Text color={C.greenDim}> {agent.thinking.slice(0, 60)}</Text>
        : agent.status === 'failed' && agent.error
          ? <Text color={C.red}> {agent.error.slice(0, 60)}</Text>
          : null}
      {elapsed
        ? <Text color={C.dim}> ({elapsed})</Text>
        : null}
    </Box>
  )
}

function BusRow({ msg }: { msg: SwarmMessage }) {
  const fromColour = msg.from === 'ORACLE' ? C.yellow : C.greenDim
  const typeColour: Record<string, string> = {
    broadcast: C.green,
    finding:   C.greenDim,
    status:    C.dim,
    result:    C.white,
    question:  C.cyan,
    answer:    C.cyan,
  }
  const tc = typeColour[msg.type] ?? C.dim
  const toLabel = msg.to === 'all' ? '→ ALL' : `→ ${msg.to}`
  const snippet = msg.content.replace(/\n+/g, ' ').slice(0, 90)

  return (
    <Box>
      <Text color={fromColour}>{msg.from.slice(0, 14).padEnd(14)}</Text>
      <Text color={tc}>{toLabel.padEnd(8)}</Text>
      <Text color={C.dim}>{msg.type.padEnd(10)}</Text>
      <Text color={C.white}>{snippet}</Text>
    </Box>
  )
}

function PhaseBar({ phase, agentCount, doneCount }: {
  phase: SwarmState['phase']
  agentCount: number
  doneCount: number
}) {
  const phaseColour: Record<string, string> = {
    planning:  C.yellow,
    executing: C.cyan,
    reviewing: C.greenDim,
    done:      C.green,
    failed:    C.red,
  }
  const colour = phaseColour[phase] ?? C.dim
  const bar = agentCount > 0
    ? `[${'█'.repeat(doneCount)}${'░'.repeat(agentCount - doneCount)}] ${doneCount}/${agentCount}`
    : ''

  return (
    <Box>
      <Text color={colour} bold>PHASE: {phase.toUpperCase().padEnd(10)}</Text>
      <Text color={C.dim}>{bar}</Text>
    </Box>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

type DashProps = {
  epic: string
  context: ProcessUserInputContext
  onDone: (result?: string, opts?: { display?: CommandResultDisplay }) => void
}

function SwarmDashboard({ epic, context, onDone }: DashProps) {
  const [swarmState, setSwarmState] = useState<SwarmState | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const abortRef = useRef(new AbortController())
  const startedRef = useRef(false)

  const buildCacheSafeParams = useCallback(async (): Promise<CacheSafeParams> => {
    const saved = getLastCacheSafeParams()
    const fork = getMessagesAfterCompactBoundary(context.messages)

    if (saved) {
      return { ...saved, toolUseContext: context, forkContextMessages: fork }
    }

    const [rawSystem, userCtx, sysCtx] = await Promise.all([
      getSystemPrompt(
        context.options.tools,
        (context.options as { mainLoopModel?: string }).mainLoopModel ?? '',
        [],
        context.options.mcpClients,
      ),
      getUserContext(),
      getSystemContext(),
    ])

    return {
      systemPrompt: asSystemPrompt(rawSystem),
      userContext: userCtx,
      systemContext: sysCtx,
      toolUseContext: context,
      forkContextMessages: fork,
    }
  }, [context])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    void (async () => {
      try {
        const csp = await buildCacheSafeParams()
        const canUseTool = context.canUseTool ?? (() => Promise.resolve({ behavior: 'allow' as const }))

        const finalState = await runSwarm({
          epic,
          cacheSafeParams: csp,
          canUseTool,
          onStateUpdate: s => setSwarmState(s),
          abortSignal: abortRef.current.signal,
        })

        onDone(finalState.result, { display: 'text' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        onDone(`Swarm failed: ${msg}`, { display: 'system' })
      }
    })()

    return () => abortRef.current.abort()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!swarmState) {
    return (
      <Box flexDirection="column">
        <Text color={C.green}>◈ AGENT SWARM initialising…</Text>
        <Text color={C.dim}>{epic.slice(0, 80)}</Text>
      </Box>
    )
  }

  const doneCount = swarmState.agents.filter(
    a => a.status === 'done' || a.status === 'failed',
  ).length

  // Show last 6 bus messages
  const recentBus = swarmState.bus.slice(-6)

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Header */}
      <Box borderStyle="single" borderColor={C.greenDark} paddingX={1}>
        <Text color={C.green} bold>◈ AGENT SWARM  </Text>
        <Text color={C.dim}>{epic.slice(0, 64)}</Text>
      </Box>

      {/* Phase bar */}
      <Box paddingX={1}>
        <PhaseBar
          phase={swarmState.phase}
          agentCount={swarmState.agents.length}
          doneCount={doneCount}
        />
      </Box>

      {/* Agents */}
      {swarmState.agents.length > 0 && (
        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Text color={C.greenDark} bold>AGENTS</Text>
          {swarmState.agents.map(a => (
            <AgentRow key={a.id} agent={a} />
          ))}
        </Box>
      )}

      {/* Message bus */}
      {recentBus.length > 0 && (
        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Text color={C.greenDark} bold>SWARM BUS  </Text>
          <Text color={C.dim}>(last {recentBus.length} messages)</Text>
          {recentBus.map(m => (
            <BusRow key={m.id} msg={m} />
          ))}
        </Box>
      )}

      {error && (
        <Box paddingX={1} marginTop={1}>
          <Text color={C.red}>✗ {error}</Text>
        </Box>
      )}

      {swarmState.phase === 'done' && (
        <Box paddingX={1} marginTop={1}>
          <Text color={C.green} bold>
            ✦ Synthesis complete — result posted to conversation
          </Text>
        </Box>
      )}
    </Box>
  )
}

// ── Command entrypoint ───────────────────────────────────────────────────────

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  const epic = (args ?? '').trim()

  if (!epic) {
    onDone(
      'Usage: /swarm <epic description>\n\nExample:\n  /swarm implement JWT authentication with refresh tokens',
      { display: 'system' },
    )
    return null
  }

  return (
    <SwarmDashboard
      epic={epic}
      context={context as ProcessUserInputContext}
      onDone={onDone}
    />
  )
}
