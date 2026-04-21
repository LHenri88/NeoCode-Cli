/**
 * Epic → SwarmPlan decomposition.
 *
 * Runs a lightweight forked agent with a structured prompt that returns JSON.
 * Falls back to a sensible 3-agent plan if parsing fails.
 */

import type { CanUseToolFn } from '../../hooks/useCanUseTool.js'
import {
  extractResultText,
  runForkedAgent,
  type CacheSafeParams,
} from '../../utils/forkedAgent.js'
import { createUserMessage } from '../../utils/messages.js'
import { allRoles } from './agentRoles.js'
import type { SwarmPlan } from './types.js'

const ROLE_SUMMARY = allRoles()
  .map(r => `  - ${r.role} (${r.defaultName}): ${r.focusAreas.join(', ')}`)
  .join('\n')

function buildPlanPrompt(epic: string): string {
  return `You are ORACLE, a strategic planning agent for a multi-agent software engineering swarm.

## EPIC
${epic}

## YOUR JOB
Decompose this epic into a parallel execution plan for specialized agents.
Keep it practical: 2–5 worker agents plus one final synthesizer.

## AVAILABLE ROLES
${ROLE_SUMMARY}

## RULES
1. Make tasks as parallel as possible — avoid unnecessary sequencing.
2. Use \`dependsOn\` only when one agent genuinely needs another's output.
3. Every plan MUST include a \`synthesizer\` as the final step.
4. Task descriptions must be specific and actionable (not "implement the feature").
5. Prefer \`researcher\` first when the codebase needs exploration.

## OUTPUT
Respond with ONLY this JSON block (no prose, no markdown outside the fence):

\`\`\`json
{
  "summary": "one-line description of what the swarm will produce",
  "agents": [
    {
      "role": "researcher",
      "name": "THE OPERATOR",
      "task": "Explore the codebase and surface: existing auth middleware, session handling, current user model shape, and any relevant test helpers.",
      "dependsOn": []
    },
    {
      "role": "developer",
      "name": "NEO",
      "task": "Implement JWT token generation and validation service at src/services/auth/jwt.ts following the patterns THE OPERATOR reports.",
      "dependsOn": ["THE OPERATOR"]
    },
    {
      "role": "synthesizer",
      "name": "THE ARCHITECT",
      "task": "Integrate all outputs, resolve any conflicts, ensure consistent naming, and produce the final implementation summary.",
      "dependsOn": ["NEO"]
    }
  ]
}
\`\`\`
`
}

function fallbackPlan(epic: string): SwarmPlan {
  return {
    summary: epic.slice(0, 100),
    agents: [
      {
        role: 'researcher',
        name: 'THE OPERATOR',
        task: `Explore the codebase relevant to: ${epic}. Find existing patterns, file locations, and context.`,
        dependsOn: [],
      },
      {
        role: 'developer',
        name: 'NEO',
        task: epic,
        dependsOn: ['THE OPERATOR'],
      },
      {
        role: 'tester',
        name: 'TANK',
        task: `Write tests for the implementation of: ${epic}`,
        dependsOn: ['NEO'],
      },
      {
        role: 'synthesizer',
        name: 'THE ARCHITECT',
        task: 'Integrate all outputs and produce the final result.',
        dependsOn: ['TANK'],
      },
    ],
  }
}

function ensureSynthesizer(plan: SwarmPlan): SwarmPlan {
  const hasSynth = plan.agents.some(a => a.role === 'synthesizer')
  if (hasSynth) return plan

  const allNames = plan.agents.map(a => a.name)
  return {
    ...plan,
    agents: [
      ...plan.agents,
      {
        role: 'synthesizer',
        name: 'THE ARCHITECT',
        task: 'Integrate all agent outputs, resolve conflicts, and produce the final coherent result.',
        dependsOn: allNames,
      },
    ],
  }
}

export async function decomposeEpicIntoPlan(
  epic: string,
  cacheSafeParams: CacheSafeParams,
  canUseTool: CanUseToolFn,
): Promise<SwarmPlan> {
  const result = await runForkedAgent({
    promptMessages: [createUserMessage({ content: buildPlanPrompt(epic) })],
    cacheSafeParams,
    canUseTool,
    querySource: 'agent_swarm_plan',
    forkLabel: 'swarm_planner',
    skipTranscript: true,
    maxTurns: 4,
  })

  const text = extractResultText(result.messages, '').trim()

  // Extract JSON from fenced block or bare object
  const fencedMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  const jsonStr = fencedMatch ? fencedMatch[1] : text.match(/(\{[\s\S]*\})/)?.[1]

  if (!jsonStr) return fallbackPlan(epic)

  try {
    const parsed = JSON.parse(jsonStr.trim()) as SwarmPlan
    if (!Array.isArray(parsed.agents) || parsed.agents.length === 0) {
      return fallbackPlan(epic)
    }
    return ensureSynthesizer(parsed)
  } catch {
    return fallbackPlan(epic)
  }
}
