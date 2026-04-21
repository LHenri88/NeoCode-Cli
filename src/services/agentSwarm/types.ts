/**
 * Agent Swarm — core type definitions.
 *
 * Architecture: Coordinator spawns a "planning" agent that decomposes an epic
 * into a dependency graph. Agents execute in parallel waves, communicating
 * via a shared SwarmBus (in-memory pub/sub). Works with any LLM provider.
 */

export type AgentRole =
  | 'planner'
  | 'architect'
  | 'developer'
  | 'reviewer'
  | 'tester'
  | 'researcher'
  | 'synthesizer'
  | string

export type AgentStatus =
  | 'idle'      // waiting to be scheduled
  | 'waiting'   // dependencies not yet complete
  | 'running'   // actively querying the model
  | 'done'      // completed successfully
  | 'failed'    // encountered an error

export type SwarmMessageType =
  | 'broadcast'  // important finding for all agents
  | 'finding'    // intermediate result/observation
  | 'question'   // agent asking another for info
  | 'answer'     // response to a question
  | 'result'     // final output of an agent
  | 'status'     // coordinator lifecycle event

export type SwarmMessage = {
  id: string
  from: string           // agent name or 'coordinator'
  to: string | 'all'    // agent name, id, or 'all'
  type: SwarmMessageType
  content: string
  timestamp: number
}

export type SwarmAgent = {
  id: string
  role: AgentRole
  name: string         // display name (e.g. "NEO", "TRINITY")
  task: string         // specific sub-task assigned to this agent
  status: AgentStatus
  output?: string      // final output text
  thinking?: string    // last streamed partial text (for live display)
  startedAt?: number
  finishedAt?: number
  error?: string
}

/** Structured plan produced by the planning agent */
export type SwarmPlan = {
  summary: string
  agents: SwarmAgentSpec[]
}

export type SwarmAgentSpec = {
  role: AgentRole
  name: string
  task: string
  dependsOn?: string[]  // names of agents that must complete first
}

/** Full swarm runtime state */
export type SwarmState = {
  id: string
  epic: string
  plan?: SwarmPlan
  agents: SwarmAgent[]
  bus: SwarmMessage[]
  phase: 'planning' | 'executing' | 'reviewing' | 'done' | 'failed'
  result?: string
  startedAt: number
  finishedAt?: number
  aborted: boolean
}
