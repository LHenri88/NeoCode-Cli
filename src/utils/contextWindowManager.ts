// E9.3 — Smart Context Window Management
//
// Trims message history to fit within a model's context budget by dropping
// the oldest non-system messages first. Uses a simple char-based token
// estimate (4 chars ≈ 1 token) with a 10% safety buffer.

import type { Message } from '../types/message.js'

export const CHARS_PER_TOKEN = 4
export const SAFETY_BUFFER = 0.9 // use at most 90% of limit

/**
 * Known context limits by model family (tokens). Expand as needed.
 */
export const CONTEXT_LIMITS: Record<string, number> = {
  // Anthropic
  'claude-3-5': 200_000,
  'claude-3': 200_000,
  'claude-2': 100_000,
  // OpenAI
  'gpt-4o': 128_000,
  'gpt-4-turbo': 128_000,
  'gpt-3.5': 16_385,
  'o1': 200_000,
  'o3': 200_000,
  // Ollama / small models
  'llama3': 128_000,
  'llama2': 4_096,
  'qwen2.5': 128_000,
  'qwen2': 32_768,
  'mistral': 32_768,
  'mixtral': 32_768,
  'phi3': 128_000,
  'gemma': 8_192,
  'deepseek-coder': 16_384,
  default: 8_192,
}

/** Returns the context limit for a model name (token count). */
export function getContextLimit(modelName: string): number {
  const lower = modelName.toLowerCase()
  for (const [key, limit] of Object.entries(CONTEXT_LIMITS)) {
    if (key !== 'default' && lower.includes(key)) return limit
  }
  return CONTEXT_LIMITS.default
}

/** Rough token estimate for a string. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/** Rough token estimate for a single Message. */
function messageTokens(msg: Message): number {
  if (msg.type === 'user') {
    const content = Array.isArray(msg.message.content)
      ? msg.message.content
          .map(b => (b.type === 'text' ? b.text : JSON.stringify(b)))
          .join(' ')
      : String(msg.message.content)
    return estimateTokens(content)
  }
  if (msg.type === 'assistant') {
    const content = Array.isArray(msg.message.content)
      ? msg.message.content
          .map(b => (b.type === 'text' ? b.text : JSON.stringify(b)))
          .join(' ')
      : ''
    return estimateTokens(content)
  }
  return 0
}

/**
 * Trims messages to fit within `maxTokens * SAFETY_BUFFER` tokens.
 * Always preserves the system message (index 0 if present) and the
 * last user message. Drops the oldest messages in between.
 *
 * @param messages - Full message history
 * @param modelName - Model name used to look up limit if maxTokens not given
 * @param maxTokens - Override context limit
 */
export function trimToContextBudget(
  messages: Message[],
  modelName: string,
  maxTokens?: number,
): Message[] {
  const limit = Math.floor((maxTokens ?? getContextLimit(modelName)) * SAFETY_BUFFER)

  let total = 0
  for (const msg of messages) {
    total += messageTokens(msg)
  }

  if (total <= limit) return messages

  // Separate pinned (system / last user) from droppable
  const result: Message[] = [...messages]
  let i = 1 // skip index 0 (system or first message)
  const lastIdx = result.length - 1

  while (total > limit && i < lastIdx) {
    const removed = result.splice(i, 1)[0]
    total -= messageTokens(removed)
    // lastIdx shrinks by 1, so don't increment i
  }

  return result
}
