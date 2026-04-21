/**
 * SwarmCoordinator — orchestrates the full lifecycle of an agent swarm.
 *
 * Lifecycle:
 *   1. planning   — ORACLE decomposes the epic into a dependency graph
 *   2. executing  — agents run in parallel waves (respecting dependsOn)
 *   3. reviewing  — synthesizer integrates all outputs
 *   4. done       — final result available in state.result
 *
 * Inter-agent communication: every agent broadcasts findings to the SwarmBus.
 * The next wave receives those broadcasts as context before starting.
 */

import { randomUUID } from 'crypto'
import type { CanUseToolFn } from '../../hooks/useCanUseTool.js'
import type { CacheSafeParams } from '../../utils/forkedAgent.js'
import { runSwarmAgent } from './agentRunner.js'
import { getRoleDefinition } from './agentRoles.js'
import { decomposeEpicIntoPlan } from './planDecomposer.js'
import { SwarmBus } from './SwarmBus.js'
import type { SwarmAgent, SwarmState } from './types.js'

export type SwarmOptions = {
  epic: string
  cacheSafeParams: CacheSafeParams
  canUseTool: CanUseToolFn
  /** Called on every state change — use for live UI updates. */
  onStateUpdate: (state: SwarmState) => void
  abortSignal?: AbortSignal
}

export async function runSwarm(options: SwarmOptions): Promise<SwarmState> {
  const { epic, cacheSafeParams, canUseTool, onStateUpdate, abortSignal } = options

  const bus = new SwarmBus()

  const state: SwarmState = {
    id: randomUUID(),
    epic,
    agents: [],
    bus: [],
    phase: 'planning',
    startedAt: Date.now(),
    aborted: false,
  }

  // Publish state snapshot on every bus event
  const unsub = bus.onMessage(() => {
    state.bus = bus.getLog()
    onStateUpdate(snapshot(state))
  })

  const push = () => {
    state.bus = bus.getLog()
    onStateUpdate(snapshot(state))
  }

  try {
    // ── Phase 1: Planning ───────────────────────────────────────────────────
    bus.send('ORACLE', 'all', 'status', `Analysing epic and designing execution plan…`)

    checkAbort(abortSignal, state)

    const plan = await decomposeEpicIntoPlan(epic, cacheSafeParams, canUseTool)
    state.plan = plan

    // Instantiate agent objects
    state.agents = plan.agents.map(spec => {
      const role = getRoleDefinition(spec.role)
      const agent: SwarmAgent = {
        id: randomUUID(),
        role: spec.role,
        name: spec.name ?? role.defaultName,
        task: spec.task,
        status: 'idle',
      }
      bus.register(agent.id)
      return agent
    })

    bus.send('ORACLE', 'all', 'broadcast', `Plan: ${plan.summary} — ${state.agents.length} agents deploying.`)
    state.phase = 'executing'
    push()

    // ── Phase 2: Parallel waves ─────────────────────────────────────────────
    const completedNames = new Set<string>()
    const specByName = new Map(plan.agents.map(s => [s.name, s]))

    const updateAgent = (agentId: string, patch: Partial<SwarmAgent>) => {
      const a = state.agents.find(x => x.id === agentId)
      if (a) Object.assign(a, patch)
      push()
    }

    // Iterate until all agents have run (or we detect a deadlock).
    let safeguard = state.agents.length + 1
    while (completedNames.size < state.agents.length && safeguard-- > 0) {
      checkAbort(abortSignal, state)

      // Agents ready to run: idle + all deps satisfied
      const wave = state.agents.filter(a => {
        if (a.status !== 'idle') return false
        const deps = specByName.get(a.name)?.dependsOn ?? []
        return deps.every(dep => completedNames.has(dep))
      })

      if (wave.length === 0) {
        // Deadlock recovery: run the next idle agent regardless
        const stuck = state.agents.find(a => a.status === 'idle')
        if (!stuck) break
        wave.push(stuck)
      }

      // Mark wave as waiting before launching
      for (const a of wave) {
        a.status = 'waiting'
      }
      push()

      // Run wave in parallel
      await Promise.allSettled(
        wave.map(async agent => {
          try {
            await runSwarmAgent(
              agent,
              epic,
              bus,
              cacheSafeParams,
              canUseTool,
              updateAgent,
            )
            completedNames.add(agent.name)
          } catch {
            // Count as done so the loop can proceed past a failing agent
            completedNames.add(agent.name)
          }
        }),
      )
    }

    // ── Phase 3: Synthesize ─────────────────────────────────────────────────
    state.phase = 'reviewing'
    bus.send('ORACLE', 'all', 'status', 'All agents done. THE ARCHITECT is synthesizing…')
    push()

    const synthAgent = state.agents.find(a => a.role === 'synthesizer')
    state.result =
      synthAgent?.output ??
      state.agents
        .filter(a => a.output)
        .map(a => `### ${a.name} (${a.role})\n\n${a.output}`)
        .join('\n\n---\n\n')

    state.phase = 'done'
    state.finishedAt = Date.now()
    bus.send('ORACLE', 'all', 'status', `Swarm complete in ${Math.round((state.finishedAt - state.startedAt) / 1000)}s.`)
    push()

    return snapshot(state)
  } catch (err) {
    state.phase = 'failed'
    state.finishedAt = Date.now()
    push()
    throw err
  } finally {
    unsub()
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function snapshot(state: SwarmState): SwarmState {
  return {
    ...state,
    agents: state.agents.map(a => ({ ...a })),
    bus: [...state.bus],
  }
}

function checkAbort(signal: AbortSignal | undefined, state: SwarmState): void {
  if (signal?.aborted) {
    state.aborted = true
    throw new Error('Swarm aborted by user')
  }
}
