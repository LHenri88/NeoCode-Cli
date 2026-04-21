/**
 * Single-agent runner for the swarm.
 *
 * Builds a role-aware prompt, injects bus context (broadcasts from other
 * agents), runs the forked query loop, extracts the broadcast section from
 * the output, and posts it back to the bus for downstream agents.
 */

import type { CanUseToolFn } from '../../hooks/useCanUseTool.js'
import {
  extractResultText,
  runForkedAgent,
  type CacheSafeParams,
} from '../../utils/forkedAgent.js'
import { createUserMessage } from '../../utils/messages.js'
import { getRoleDefinition } from './agentRoles.js'
import type { SwarmBus } from './SwarmBus.js'
import type { SwarmAgent, SwarmMessage } from './types.js'

// Regex to extract the broadcast section agents must include at the end.
const BROADCAST_RE = /```broadcast\s*\n([\s\S]*?)\n```/i

function buildAgentPrompt(
  agent: SwarmAgent,
  epic: string,
  contextMessages: SwarmMessage[],
): string {
  const role = getRoleDefinition(agent.role)

  const contextSection =
    contextMessages.length > 0
      ? '\n\n## CONTEXT FROM OTHER AGENTS\n' +
        contextMessages
          .map(m => `**[${m.from}]** (${m.type}): ${m.content}`)
          .join('\n\n')
      : ''

  return `${role.systemPersona}

## OVERALL EPIC
${epic}

## YOUR SPECIFIC TASK
${agent.task}${contextSection}

## INSTRUCTIONS
- Execute your task completely. No placeholders, no "TODO: implement later".
- Be concrete: name files, write actual code, give real decisions.
- At the END of your response, include a broadcast block with the key
  findings/decisions that other agents must know:

\`\`\`broadcast
[your key findings here — what you built, decided, or discovered]
\`\`\`

Begin now.`
}

export async function runSwarmAgent(
  agent: SwarmAgent,
  epic: string,
  bus: SwarmBus,
  cacheSafeParams: CacheSafeParams,
  canUseTool: CanUseToolFn,
  onUpdate: (agentId: string, patch: Partial<SwarmAgent>) => void,
): Promise<void> {
  // Seed inbox with all broadcasts before building prompt
  bus.seedContext(agent.id)
  const contextMessages = bus.read(agent.id)

  const prompt = buildAgentPrompt(agent, epic, contextMessages)

  onUpdate(agent.id, { status: 'running', startedAt: Date.now() })

  try {
    const result = await runForkedAgent({
      promptMessages: [createUserMessage({ content: prompt })],
      cacheSafeParams,
      canUseTool,
      querySource: 'agent_swarm',
      forkLabel: `swarm_${agent.role}_${agent.name.toLowerCase().replace(/\s+/g, '_')}`,
      skipTranscript: false,
      onMessage: msg => {
        if (msg.type !== 'assistant') return
        // Stream partial thinking to the UI
        const text = msg.message.content
          .filter((b: { type: string }) => b.type === 'text')
          .map((b: { type: string; text?: string }) => (b as { type: 'text'; text: string }).text)
          .join('')
        if (text) {
          const snippet = text.split('\n').at(-1)?.trim() ?? ''
          if (snippet) onUpdate(agent.id, { thinking: snippet.slice(0, 120) })
        }
      },
    })

    const output = extractResultText(result.messages, `${agent.name} completed.`)

    // Extract and broadcast the agent's findings
    const broadcastMatch = BROADCAST_RE.exec(output)
    const broadcastContent = broadcastMatch?.[1]?.trim()

    if (broadcastContent) {
      bus.send(agent.name, 'all', 'broadcast', broadcastContent)
    } else {
      // Fallback: short summary so downstream agents still get context
      const firstLine = output.split('\n').find(l => l.trim().length > 10) ?? output.slice(0, 200)
      bus.send(agent.name, 'all', 'finding', `${agent.name}: ${firstLine.trim()}`)
    }

    onUpdate(agent.id, {
      status: 'done',
      output,
      thinking: undefined,
      finishedAt: Date.now(),
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    onUpdate(agent.id, { status: 'failed', error, finishedAt: Date.now() })
    bus.send(agent.name, 'all', 'status', `${agent.name} FAILED: ${error.slice(0, 200)}`)
    throw err
  }
}
