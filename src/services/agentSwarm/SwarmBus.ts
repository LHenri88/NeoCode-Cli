/**
 * SwarmBus — in-memory message bus for inter-agent communication.
 *
 * Each agent has a private inbox. The coordinator and agents send messages
 * via send(). Agents drain their inbox via read() before executing.
 * seedContext() re-delivers all broadcasts to an agent so late-starting
 * agents receive everything emitted before they began.
 */

import { randomUUID } from 'crypto'
import type { SwarmMessage, SwarmMessageType } from './types.js'

export class SwarmBus {
  private readonly inboxes = new Map<string, SwarmMessage[]>()
  private readonly log: SwarmMessage[] = []
  private readonly listeners: Array<(msg: SwarmMessage) => void> = []

  /** Register an agent inbox keyed by its ID. */
  register(agentId: string): void {
    this.inboxes.set(agentId, [])
  }

  /**
   * Send a message. If `to` is 'all', delivers to every registered inbox.
   * Returns the created message for callers that need the id/timestamp.
   */
  send(
    from: string,
    to: string | 'all',
    type: SwarmMessageType,
    content: string,
  ): SwarmMessage {
    const msg: SwarmMessage = {
      id: randomUUID(),
      from,
      to,
      type,
      content,
      timestamp: Date.now(),
    }
    this.log.push(msg)

    if (to === 'all') {
      for (const inbox of this.inboxes.values()) {
        inbox.push(msg)
      }
    } else {
      this.inboxes.get(to)?.push(msg)
    }

    for (const listener of this.listeners) {
      listener(msg)
    }
    return msg
  }

  /**
   * Drain and return all pending messages for `agentId`.
   * The inbox is cleared after reading.
   */
  read(agentId: string): SwarmMessage[] {
    const msgs = [...(this.inboxes.get(agentId) ?? [])]
    this.inboxes.set(agentId, [])
    return msgs
  }

  /**
   * Seed an agent's inbox with all broadcasts/findings emitted so far
   * (deduped). Call this just before running a late-starting agent so it
   * has the full context from earlier waves.
   */
  seedContext(agentId: string): void {
    const inbox = this.inboxes.get(agentId) ?? []
    const existing = new Set(inbox.map(m => m.id))
    const broadcasts = this.log.filter(
      m => (m.type === 'broadcast' || m.type === 'finding') && !existing.has(m.id),
    )
    inbox.push(...broadcasts)
    this.inboxes.set(agentId, inbox)
  }

  /** Full ordered log of every message ever sent. */
  getLog(): SwarmMessage[] {
    return this.log
  }

  /**
   * Subscribe to new messages. Returns an unsubscribe function.
   * Used by the coordinator to push live updates to the UI.
   */
  onMessage(listener: (msg: SwarmMessage) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const idx = this.listeners.indexOf(listener)
      if (idx !== -1) this.listeners.splice(idx, 1)
    }
  }

  /** Number of messages in a given agent's inbox (without consuming). */
  pendingCount(agentId: string): number {
    return this.inboxes.get(agentId)?.length ?? 0
  }
}
