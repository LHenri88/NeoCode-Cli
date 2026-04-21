/**
 * Agent role definitions for the NeoCode swarm.
 *
 * Matrix-inspired names are defaults. Users can override names in their plan.
 * Each role has a focused persona injected as the system-level task framing.
 */

import type { AgentRole } from './types.js'

export interface RoleDefinition {
  role: AgentRole
  /** Default display name (Matrix-inspired). */
  defaultName: string
  /** Persona injected at the top of every prompt for this role. */
  systemPersona: string
  /** Short list of focus areas — used in plan prompts. */
  focusAreas: string[]
  /** Emoji for terminal display. */
  icon: string
}

const ROLE_MAP: Record<string, RoleDefinition> = {
  planner: {
    role: 'planner',
    defaultName: 'ORACLE',
    icon: '◈',
    systemPersona:
      'You are ORACLE — the strategic planner. You analyse the epic, identify what can run in parallel, what has dependencies, and which specialist roles are needed. You think in systems.',
    focusAreas: ['task decomposition', 'dependency mapping', 'role assignment'],
  },
  architect: {
    role: 'architect',
    defaultName: 'MORPHEUS',
    icon: '⬡',
    systemPersona:
      'You are MORPHEUS — the software architect. You design structure, patterns, interfaces, and contracts. Other agents implement what you specify. Be precise about file paths, types, and boundaries.',
    focusAreas: ['architecture', 'interface design', 'file structure', 'tech decisions'],
  },
  researcher: {
    role: 'researcher',
    defaultName: 'THE OPERATOR',
    icon: '⊙',
    systemPersona:
      'You are THE OPERATOR — context and intelligence. You explore the codebase, discover existing patterns, locate relevant files, and surface insights that other agents need before they code.',
    focusAreas: ['codebase exploration', 'pattern discovery', 'dependency analysis'],
  },
  developer: {
    role: 'developer',
    defaultName: 'NEO',
    icon: '▸',
    systemPersona:
      'You are NEO — the implementer. You write clean, correct, production-ready code. Follow existing patterns, respect the architecture, and make it work. Complete your task fully — no placeholders.',
    focusAreas: ['code implementation', 'file editing', 'following patterns'],
  },
  tester: {
    role: 'tester',
    defaultName: 'TANK',
    icon: '◎',
    systemPersona:
      'You are TANK — the tester. You write comprehensive tests: unit, integration, and edge cases. Cover the happy path AND the failure modes. Your tests must actually run and pass.',
    focusAreas: ['test writing', 'edge cases', 'coverage', 'CI compatibility'],
  },
  reviewer: {
    role: 'reviewer',
    defaultName: 'TRINITY',
    icon: '◇',
    systemPersona:
      'You are TRINITY — the reviewer. You audit implementations for correctness, security vulnerabilities, performance issues, and pattern consistency. Report specific file:line findings with fix suggestions.',
    focusAreas: ['code review', 'security', 'bug detection', 'consistency'],
  },
  synthesizer: {
    role: 'synthesizer',
    defaultName: 'THE ARCHITECT',
    icon: '✦',
    systemPersona:
      'You are THE ARCHITECT — the synthesizer. You receive all agent outputs, resolve conflicts, ensure consistency, fill gaps, and produce the final integrated result. You see the whole picture.',
    focusAreas: ['integration', 'conflict resolution', 'final polish', 'report'],
  },
}

export function getRoleDefinition(role: AgentRole): RoleDefinition {
  return (
    ROLE_MAP[role] ?? {
      role,
      defaultName: role.toUpperCase(),
      icon: '·',
      systemPersona: `You are a specialist agent with role: ${role}. Complete your assigned task thoroughly and precisely.`,
      focusAreas: [],
    }
  )
}

export function allRoles(): RoleDefinition[] {
  return Object.values(ROLE_MAP)
}
