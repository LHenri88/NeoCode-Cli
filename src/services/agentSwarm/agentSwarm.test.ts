import { describe, expect, test } from 'bun:test'
import { SwarmBus } from './SwarmBus.js'
import { getRoleDefinition, allRoles } from './agentRoles.js'

// ── SwarmBus ─────────────────────────────────────────────────────────────────

describe('SwarmBus', () => {
  test('delivers broadcast messages to all registered agents', () => {
    const bus = new SwarmBus()
    bus.register('agent-1')
    bus.register('agent-2')

    bus.send('coordinator', 'all', 'broadcast', 'Hello agents')

    expect(bus.read('agent-1')).toHaveLength(1)
    expect(bus.read('agent-2')).toHaveLength(1)
  })

  test('delivers direct messages only to the target agent', () => {
    const bus = new SwarmBus()
    bus.register('agent-1')
    bus.register('agent-2')

    bus.send('coordinator', 'agent-1', 'status', 'Only for you')

    expect(bus.read('agent-1')).toHaveLength(1)
    expect(bus.read('agent-2')).toHaveLength(0)
  })

  test('drains inbox after read', () => {
    const bus = new SwarmBus()
    bus.register('agent-1')
    bus.send('x', 'agent-1', 'finding', 'data')

    const first = bus.read('agent-1')
    const second = bus.read('agent-1')

    expect(first).toHaveLength(1)
    expect(second).toHaveLength(0)
  })

  test('seedContext re-delivers broadcasts without duplication', () => {
    const bus = new SwarmBus()
    bus.register('agent-1')
    bus.register('agent-2')

    // agent-1 sends a broadcast BEFORE agent-2 is seeded
    bus.send('agent-1', 'all', 'broadcast', 'I found something')

    // Drain agent-2 inbox (simulating it hasn't read yet)
    bus.read('agent-2')

    // Now seed agent-2 with historical broadcasts
    bus.seedContext('agent-2')
    const msgs = bus.read('agent-2')

    expect(msgs).toHaveLength(1)
    expect(msgs[0]!.content).toBe('I found something')
  })

  test('seedContext does not duplicate already-present messages', () => {
    const bus = new SwarmBus()
    bus.register('agent-1')

    bus.send('x', 'all', 'broadcast', 'first')
    bus.send('x', 'all', 'broadcast', 'second')

    // agent-1 already has both in its inbox
    expect(bus.pendingCount('agent-1')).toBe(2)

    // Seeding should not add duplicates
    bus.seedContext('agent-1')
    expect(bus.pendingCount('agent-1')).toBe(2)
  })

  test('getLog returns all messages in order', () => {
    const bus = new SwarmBus()
    bus.register('a')
    bus.send('coordinator', 'a', 'status', 'first')
    bus.send('a', 'all', 'broadcast', 'second')

    const log = bus.getLog()
    expect(log).toHaveLength(2)
    expect(log[0]!.content).toBe('first')
    expect(log[1]!.content).toBe('second')
  })

  test('onMessage listener fires for each new message', () => {
    const bus = new SwarmBus()
    bus.register('a')

    const received: string[] = []
    const unsub = bus.onMessage(msg => received.push(msg.content))

    bus.send('x', 'a', 'finding', 'alpha')
    bus.send('x', 'all', 'broadcast', 'beta')

    expect(received).toEqual(['alpha', 'beta'])

    unsub()
    bus.send('x', 'a', 'finding', 'gamma')
    expect(received).toHaveLength(2) // listener unsubscribed
  })
})

// ── agentRoles ────────────────────────────────────────────────────────────────

describe('agentRoles', () => {
  test('getRoleDefinition returns known roles', () => {
    const neo = getRoleDefinition('developer')
    expect(neo.defaultName).toBe('NEO')
    expect(neo.icon).toBeTruthy()
    expect(neo.systemPersona.length).toBeGreaterThan(20)
  })

  test('getRoleDefinition returns fallback for unknown roles', () => {
    const custom = getRoleDefinition('wizard')
    expect(custom.defaultName).toBe('WIZARD')
    expect(custom.role).toBe('wizard')
  })

  test('allRoles returns all 7 built-in roles', () => {
    expect(allRoles()).toHaveLength(7)
    const roleNames = allRoles().map(r => r.role)
    expect(roleNames).toContain('planner')
    expect(roleNames).toContain('synthesizer')
    expect(roleNames).toContain('developer')
  })
})
