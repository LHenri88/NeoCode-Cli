export { runSwarm, type SwarmOptions } from './SwarmCoordinator.js'
export { SwarmBus } from './SwarmBus.js'
export { getRoleDefinition, allRoles } from './agentRoles.js'
export { decomposeEpicIntoPlan } from './planDecomposer.js'
export type {
  AgentRole,
  AgentStatus,
  SwarmAgent,
  SwarmMessage,
  SwarmMessageType,
  SwarmPlan,
  SwarmAgentSpec,
  SwarmState,
} from './types.js'
