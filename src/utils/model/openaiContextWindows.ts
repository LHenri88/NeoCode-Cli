/**
 * openaiContextWindows.ts
 * Context window sizes for OpenAI-compatible models used via the shim.
 * Fixes: auto-compact and warnings using wrong 200k default for OpenAI models.
 *
 * When CLAUDE_CODE_USE_OPENAI=1, getContextWindowForModel() falls through to
 * MODEL_CONTEXT_WINDOW_DEFAULT (200k). This causes the warning and blocking
 * thresholds to be set at 200k even for models like gpt-4o (128k) or llama3 (8k),
 * meaning users get no warning before hitting a hard API error.
 *
 * Prices in tokens as of April 2026 — update as needed.
 */

const OPENAI_CONTEXT_WINDOWS: Record<string, number> = {
  // OpenAI
  'gpt-5.4':               1_050_000,
  'gpt-5.4-mini':            400_000,
  'gpt-5.4-nano':            400_000,
  'gpt-4o':                   128_000,
  'gpt-4o-mini':              128_000,
  'gpt-4.1':                  1_047_576,
  'gpt-4.1-mini':             1_047_576,
  'gpt-4.1-nano':             1_047_576,
  'gpt-4-turbo':              128_000,
  'gpt-4':                     8_192,
  'o1':                       200_000,
  'o1-mini':                  128_000,
  'o1-preview':               128_000,
  'o1-pro':                   200_000,
  'o3':                       200_000,
  'o3-mini':                  200_000,
  'o4-mini':                  200_000,

  // DeepSeek (V3: 128k context per official docs)
  'deepseek-chat':            128_000,
  'deepseek-reasoner':        128_000,

  // Groq (fast inference)
  'llama-3.3-70b-versatile':  128_000,
  'llama-3.1-8b-instant':     128_000,
  'mixtral-8x7b-32768':        32_768,

  // Mistral
  'mistral-large-latest':     131_072,
  'mistral-small-latest':     131_072,

  // MiniMax
  'MiniMax-M2.7':             204_800,
  'minimax-m2.7':             204_800,

  // OpenRouter — top coding models (IDs without :free/:extended/:nitro suffix)
  'qwen/qwen3-coder':                   262_144,
  'qwen/qwen3-235b-a22b':              262_144,
  'qwen/qwen3-next-80b-a3b-instruct':  262_144,
  'google/gemma-4-31b-it':             131_072,
  'google/gemma-4-26b-a4b-it':         131_072,
  'openai/gpt-oss-120b':               200_000,
  'openai/gpt-oss-20b':                200_000,
  'openai/gpt-4.1':                  1_047_576,
  'openai/gpt-4o':                     128_000,
  'meta-llama/llama-3.3-70b-instruct': 131_072,
  'anthropic/claude-opus-4-6':         200_000,
  'anthropic/claude-opus-4.6':         200_000,
  'anthropic/claude-sonnet-4-6':       200_000,
  'anthropic/claude-sonnet-4.6':       200_000,
  'anthropic/claude-haiku-4-5':        200_000,
  'deepseek/deepseek-r1':              128_000,
  'deepseek/deepseek-v3.2':            128_000,
  'deepseek/deepseek-chat-v3.1':       128_000,
  'deepseek/deepseek-chat':            128_000,
  'minimax/minimax-m1':              1_000_000,
  'minimax/minimax-m2.5-20260211':     200_000,
  'google/gemini-2.5-pro':           1_048_576,
  'google/gemini-2.5-flash':         1_048_576,

  // Google (via OpenRouter)
  'google/gemini-2.0-flash':1_048_576,

  // Google (native via CLAUDE_CODE_USE_GEMINI)
  'gemini-2.0-flash':       1_048_576,
  'gemini-2.5-pro':         1_048_576,
  'gemini-2.5-flash':       1_048_576,

  // Ollama local models
  // Llama 3.1+ models support 128k context natively (Meta official specs).
  // Ollama defaults to num_ctx=8192 but users can configure higher values.
  'llama3.3':                 128_000,   // short name without tag
  'llama3.3:70b':             128_000,
  'llama3.1':                 128_000,
  'llama3.1:8b':              128_000,
  'llama3.2':                 128_000,
  'llama3.2:3b':              128_000,
  'llama3.2:1b':              128_000,
  'qwen2.5-coder':             32_768,
  'qwen2.5-coder:32b':        32_768,
  'qwen2.5-coder:7b':         32_768,
  'deepseek-coder-v2:16b':    163_840,
  'deepseek-r1':               65_536,   // short name without tag
  'deepseek-r1:7b':            65_536,
  'deepseek-r1:14b':           65_536,
  'mistral':                   32_768,
  'mistral:7b':                32_768,
  'phi4':                      16_384,   // short name without tag
  'phi4:14b':                  16_384,
  'gemma3':                   128_000,   // Gemma 3 supports 128k
  'gemma3:12b':               128_000,
  'gemma3:27b':               128_000,
  'gemma2:27b':                 8_192,
  'codellama:13b':              16_384,
  'qwen3':                    128_000,
  'qwen3:8b':                 128_000,
  'codestral':                 32_768,
  'devstral':                  32_768,   // Devstral by Mistral
}

/**
 * Max output (completion) tokens per model.
 * This is separate from the context window (input limit).
 * Fixes: 400 error "max_tokens is too large" when default 32k exceeds model limit.
 */
const OPENAI_MAX_OUTPUT_TOKENS: Record<string, number> = {
  // OpenAI
  'gpt-5.4':                 128_000,
  'gpt-5.4-mini':            128_000,
  'gpt-5.4-nano':            128_000,
  'gpt-4o':                   16_384,
  'gpt-4o-mini':              16_384,
  'gpt-4.1':                  32_768,
  'gpt-4.1-mini':             32_768,
  'gpt-4.1-nano':             32_768,
  'gpt-4-turbo':               4_096,
  'gpt-4':                     4_096,
  'o1':                       100_000,
  'o1-mini':                   65_536,
  'o1-preview':                32_768,
  'o1-pro':                   100_000,
  'o3':                       100_000,
  'o3-mini':                  100_000,
  'o4-mini':                  100_000,

  // DeepSeek
  'deepseek-chat':              8_192,
  'deepseek-reasoner':         32_768,

  // Groq
  'llama-3.3-70b-versatile':  32_768,
  'llama-3.1-8b-instant':      8_192,
  'mixtral-8x7b-32768':       32_768,

  // Mistral
  'mistral-large-latest':     32_768,
  'mistral-small-latest':     32_768,

  // MiniMax
  'MiniMax-M2.7':            131_072,
  'minimax-m2.7':            131_072,

  // OpenRouter — top coding models
  'qwen/qwen3-coder':                    8_192,
  'qwen/qwen3-235b-a22b':               8_192,
  'qwen/qwen3-next-80b-a3b-instruct':   8_192,
  'google/gemma-4-31b-it':              8_192,
  'google/gemma-4-26b-a4b-it':          8_192,
  'openai/gpt-oss-120b':               32_768,
  'openai/gpt-oss-20b':                32_768,
  'openai/gpt-4.1':                    32_768,
  'openai/gpt-4o':                     16_384,
  'meta-llama/llama-3.3-70b-instruct':  8_192,
  'anthropic/claude-opus-4-6':         128_000,
  'anthropic/claude-opus-4.6':         128_000,
  'anthropic/claude-sonnet-4-6':        32_000,
  'anthropic/claude-sonnet-4.6':        32_000,
  'anthropic/claude-haiku-4-5':          8_192,
  'deepseek/deepseek-r1':              32_768,
  'deepseek/deepseek-v3.2':             8_192,
  'deepseek/deepseek-chat-v3.1':        8_192,
  'deepseek/deepseek-chat':             8_192,
  'minimax/minimax-m1':               40_960,
  'minimax/minimax-m2.5-20260211':    40_960,
  'google/gemini-2.5-pro':            65_536,
  'google/gemini-2.5-flash':          65_536,

  // Google (via OpenRouter)
  'google/gemini-2.0-flash':   8_192,

  // Google (native via CLAUDE_CODE_USE_GEMINI)
  'gemini-2.0-flash':          8_192,
  'gemini-2.5-pro':           65_536,
  'gemini-2.5-flash':         65_536,

  // Ollama local models (conservative safe defaults)
  'llama3.3':                   4_096,
  'llama3.3:70b':               4_096,
  'llama3.1':                   4_096,
  'llama3.1:8b':                4_096,
  'llama3.2':                   4_096,
  'llama3.2:3b':                4_096,
  'llama3.2:1b':                4_096,
  'qwen2.5-coder':              8_192,
  'qwen2.5-coder:32b':         8_192,
  'qwen2.5-coder:7b':          8_192,
  'deepseek-coder-v2:16b':     8_192,
  'deepseek-r1':                8_192,
  'deepseek-r1:7b':             8_192,
  'deepseek-r1:14b':            8_192,
  'mistral':                    4_096,
  'mistral:7b':                 4_096,
  'phi4':                       4_096,
  'phi4:14b':                   4_096,
  'gemma3':                     8_192,
  'gemma3:12b':                 8_192,
  'gemma3:27b':                 8_192,
  'gemma2:27b':                 4_096,
  'codellama:13b':              4_096,
  'qwen3':                      8_192,
  'qwen3:8b':                   8_192,
  'codestral':                  8_192,
  'devstral':                   8_192,
}

// Strip OpenRouter / provider suffixes before table lookup.
// e.g. 'qwen/qwen3-coder:free' → 'qwen/qwen3-coder'
//      'anthropic/claude-opus-4-6:beta' → 'anthropic/claude-opus-4-6'
function normalizeModelId(model: string): string {
  return model.replace(/:free$|:extended$|:beta$|:online$|:nitro$/, '')
}

function lookupByModel<T>(table: Record<string, T>, model: string): T | undefined {
  const normalized = normalizeModelId(model)
  if (table[normalized] !== undefined) return table[normalized]
  if (table[model] !== undefined) return table[model]
  // Sort keys by length descending so the most specific prefix wins.
  // Without this, 'gpt-4-turbo-preview' could match 'gpt-4' (8k) instead
  // of 'gpt-4-turbo' (128k) depending on V8's key iteration order.
  const sortedKeys = Object.keys(table).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (normalized.startsWith(key) || model.startsWith(key)) return table[key]
  }
  return undefined
}

/**
 * Look up the context window for an OpenAI-compatible model.
 * Returns undefined if the model is not in the table.
 *
 * Falls back to prefix matching so dated variants like
 * "gpt-4o-2024-11-20" resolve to the base "gpt-4o" entry.
 */
export function getOpenAIContextWindow(model: string): number | undefined {
  return lookupByModel(OPENAI_CONTEXT_WINDOWS, model)
}

/**
 * Look up the max output tokens for an OpenAI-compatible model.
 * Returns undefined if the model is not in the table.
 */
export function getOpenAIMaxOutputTokens(model: string): number | undefined {
  return lookupByModel(OPENAI_MAX_OUTPUT_TOKENS, model)
}
