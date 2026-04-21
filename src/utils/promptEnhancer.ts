// E9 — Prompt Enhancement
//
// Rewrites prompts before sending to the model:
//   - Injects chain-of-thought prefix for small models (< 14B params)
//   - Identity pass-through for large models

export type EnhanceStrategy = 'cot-prefix' | 'identity'

const COT_PREFIX = `Before answering, think step by step inside <thinking> tags. Only output your final answer outside the tags.\n\n`

const COT_SUFFIX_STRIP = /<thinking>[\s\S]*?<\/thinking>\s*/g

/**
 * Heuristic: model is "small" when its name contains a param count < 14B.
 * Examples: qwen2.5-coder:7b → small, llama3.1:70b → large, claude-* → large.
 */
export function isSmallModel(modelName: string): boolean {
  const lower = modelName.toLowerCase()
  // Explicit large-model families — never inject CoT
  if (/claude|gpt-4|o[123]|gemini-1\.5-pro|gemini-2|llama.*70b|qwen.*72b|mistral.*large/.test(lower)) {
    return false
  }
  // Extract param count from model name (e.g., "7b", "13b", "3.8b")
  const match = lower.match(/[\s:_-](\d+(?:\.\d+)?)b/)
  if (match) {
    const params = parseFloat(match[1])
    return params < 14
  }
  return false
}

export function getEnhanceStrategy(modelName: string): EnhanceStrategy {
  return isSmallModel(modelName) ? 'cot-prefix' : 'identity'
}

/**
 * Rewrites a user prompt for the given model.
 * Returns the enhanced prompt. Never modifies system prompts.
 */
export function enhanceUserPrompt(prompt: string, modelName: string): string {
  const strategy = getEnhanceStrategy(modelName)
  if (strategy === 'cot-prefix') {
    return COT_PREFIX + prompt
  }
  return prompt
}

/**
 * Strips CoT <thinking> blocks from an assistant response so they are
 * not shown to the user. Safe to call on all responses.
 */
export function stripCotFromResponse(text: string): string {
  return text.replace(COT_SUFFIX_STRIP, '').trimStart()
}
