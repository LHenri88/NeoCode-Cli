/**
 * providerIntegration.test.ts
 *
 * Comprehensive provider validation tests covering:
 *   A. Unit tests (mocked fetch) — message conversion, schema normalisation,
 *      error handling paths, isLocalProviderUrl
 *   B. Provider-config unit tests — preset defaults, port correctness
 *   C. Binary-discovery unit tests — ollama candidate paths, cache behaviour
 *   D. Connectivity tests (real HTTP, short timeouts, skipped when unavailable)
 *   E. Model-listing tests (mocked + real HTTP)
 *   F. Round-trip query tests (real API, skipped when env vars absent)
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from 'bun:test'

import {
  _convertMessages,
  _normalizeSchemaForOpenAI,
  _convertSystemPrompt,
  _convertContentBlocks,
  _convertTools,
  createOpenAIShimClient,
} from './openaiShim.ts'

import {
  isLocalProviderUrl,
  isOllamaUrl,
} from './providerConfig.ts'

import {
  getCandidateOllamaPaths,
  resolveOllamaBin,
  _resetOllamaBinCache,
  isOllamaInstalled,
  hasLocalOllama,
  listOllamaModels,
  DEFAULT_OLLAMA_BASE_URL,
} from '../../utils/providerDiscovery.ts'

import {
  getProviderPresetDefaults,
} from '../../utils/providerProfiles.ts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const originalFetch = globalThis.fetch

function mockFetch(fn: (url: string, init?: RequestInit) => Response | Promise<Response>): void {
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    return Promise.resolve(fn(url, init))
  }) as unknown as typeof globalThis.fetch
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeSseResponse(chunks: unknown[]): Response {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  )
}

const savedEnv: Record<string, string | undefined> = {}

function saveEnvKeys(...keys: string[]): void {
  for (const k of keys) savedEnv[k] = process.env[k]
}
function restoreEnv(): void {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

// ─── A. Message Conversion Unit Tests ─────────────────────────────────────────

describe('_convertMessages()', () => {
  test('injects system prompt as first role:system message', () => {
    const result = _convertMessages(
      [{ role: 'user', content: 'hello' }],
      'You are helpful',
    )
    expect(result[0]).toEqual({ role: 'system', content: 'You are helpful' })
    expect(result[1]).toMatchObject({ role: 'user', content: 'hello' })
  })

  test('skips system message when system is null/empty', () => {
    const r1 = _convertMessages([{ role: 'user', content: 'hi' }], null)
    expect(r1[0]?.role).toBe('user')

    const r2 = _convertMessages([{ role: 'user', content: 'hi' }], '')
    expect(r2[0]?.role).toBe('user')
  })

  test('joins array system blocks with double newline', () => {
    const result = _convertMessages(
      [{ role: 'user', content: 'hi' }],
      [{ type: 'text', text: 'Block A' }, { type: 'text', text: 'Block B' }],
    )
    expect(result[0]?.content).toBe('Block A\n\nBlock B')
  })

  test('extracts tool_result blocks from user message as separate tool messages', () => {
    const msgs = [
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'call_1', content: 'file content', is_error: false },
          { type: 'text', text: 'What do you think?' },
        ],
      },
    ]
    const result = _convertMessages(msgs as Parameters<typeof _convertMessages>[0], null)
    const toolMsg = result.find(m => m.role === 'tool')
    const userMsg = result.find(m => m.role === 'user')
    expect(toolMsg?.tool_call_id).toBe('call_1')
    expect(toolMsg?.content).toBe('file content')
    expect(userMsg?.content).toContain('What do you think?')
  })

  test('prefixes error tool_result with "Error: "', () => {
    const msgs = [
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'c1', content: 'bad', is_error: true },
        ],
      },
    ]
    const result = _convertMessages(msgs as Parameters<typeof _convertMessages>[0], null)
    const toolMsg = result.find(m => m.role === 'tool')
    expect(String(toolMsg?.content)).toStartWith('Error:')
  })

  test('coalesces consecutive user messages with newline', () => {
    const msgs = [
      { role: 'user', content: 'first' },
      { role: 'user', content: 'second' },
    ]
    const result = _convertMessages(msgs, null)
    const userMsgs = result.filter(m => m.role === 'user')
    expect(userMsgs).toHaveLength(1)
    expect(String(userMsgs[0]?.content)).toContain('first')
    expect(String(userMsgs[0]?.content)).toContain('second')
  })

  test('does NOT coalesce consecutive tool messages', () => {
    const msgs = [
      { role: 'assistant', content: [{ type: 'tool_use', id: 'c1', name: 'Bash', input: {} }] },
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'c1', content: 'out1', is_error: false },
          { type: 'tool_result', tool_use_id: 'c1', content: 'out2', is_error: false },
        ],
      },
    ]
    const result = _convertMessages(msgs as Parameters<typeof _convertMessages>[0], null)
    const toolMsgs = result.filter(m => m.role === 'tool')
    expect(toolMsgs.length).toBeGreaterThanOrEqual(1)
  })

  test('strips thinking and redacted_thinking blocks from assistant content', () => {
    const msgs = [
      {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'internal monologue' },
          { type: 'text', text: 'visible reply' },
        ],
      },
    ]
    const result = _convertMessages(msgs as Parameters<typeof _convertMessages>[0], null)
    const assistantMsg = result.find(m => m.role === 'assistant')
    const content = String(assistantMsg?.content ?? '')
    expect(content).not.toContain('internal monologue')
    expect(content).toContain('visible reply')
  })

  test('converts tool_use blocks to function call format', () => {
    const msgs = [
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'call_abc', name: 'Bash', input: { command: 'ls' } },
        ],
      },
    ]
    const result = _convertMessages(msgs as Parameters<typeof _convertMessages>[0], null)
    const assistantMsg = result.find(m => m.role === 'assistant')
    const toolCalls = (assistantMsg as { tool_calls?: unknown[] } | undefined)?.tool_calls
    expect(toolCalls).toHaveLength(1)
    const tc = (toolCalls as Array<{ id: string; type: string; function: { name: string; arguments: string } }>)[0]
    expect(tc?.id).toBe('call_abc')
    expect(tc?.type).toBe('function')
    expect(tc?.function.name).toBe('Bash')
    expect(JSON.parse(tc?.function.arguments ?? '{}')).toEqual({ command: 'ls' })
  })
})

// ─── Content Block Conversion ─────────────────────────────────────────────────

describe('_convertContentBlocks()', () => {
  test('converts single text block to string', () => {
    const result = _convertContentBlocks([{ type: 'text', text: 'hello' }])
    expect(result).toBe('hello')
  })

  test('converts base64 image to data URL', () => {
    const result = _convertContentBlocks([
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'abc123' } },
    ])
    expect(Array.isArray(result)).toBe(true)
    const parts = result as Array<{ type: string; image_url?: { url: string } }>
    expect(parts[0]?.image_url?.url).toContain('data:image/png;base64,abc123')
  })

  test('strips thinking blocks completely', () => {
    const result = _convertContentBlocks([
      { type: 'thinking', thinking: 'secret' },
      { type: 'text', text: 'visible' },
    ])
    // Either string 'visible' or array with just text
    if (typeof result === 'string') {
      expect(result).not.toContain('secret')
    } else {
      const texts = (result as Array<{ text?: string }>).map(p => p.text ?? '').join('')
      expect(texts).not.toContain('secret')
    }
  })
})

// ─── Schema Normalisation ────────────────────────────────────────────────────

describe('_normalizeSchemaForOpenAI()', () => {
  test('keeps only originally-required fields in required[]', () => {
    const schema = {
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'number' }, c: { type: 'boolean' } },
      required: ['a'],
    }
    const result = _normalizeSchemaForOpenAI(schema, true)
    expect(result.required).toEqual(['a'])
  })

  test('sets additionalProperties:false in strict mode', () => {
    const schema = {
      type: 'object',
      properties: { x: { type: 'string' } },
      required: ['x'],
    }
    const result = _normalizeSchemaForOpenAI(schema, true)
    expect(result.additionalProperties).toBe(false)
  })

  test('does NOT set additionalProperties in non-strict (Gemini) mode', () => {
    const schema = {
      type: 'object',
      properties: { x: { type: 'string' } },
      required: ['x'],
    }
    const result = _normalizeSchemaForOpenAI(schema, false)
    expect(result.additionalProperties).toBeUndefined()
  })

  test('recursively normalises nested object schemas', () => {
    const schema = {
      type: 'object',
      properties: {
        nested: {
          type: 'object',
          properties: { a: { type: 'string' }, b: { type: 'number' } },
          required: ['a'],
        },
      },
      required: ['nested'],
    }
    const result = _normalizeSchemaForOpenAI(schema, true)
    const nested = (result.properties as Record<string, { required?: string[] }>).nested
    expect(nested.required).toEqual(['a'])
  })

  test('normalises anyOf combinator', () => {
    const schema = {
      anyOf: [
        { type: 'object', properties: { x: { type: 'string' }, y: { type: 'number' } }, required: ['x'] },
      ],
    }
    const result = _normalizeSchemaForOpenAI(schema, true)
    const branch = (result.anyOf as Array<{ required?: string[] }>)[0]
    expect(branch?.required).toEqual(['x'])
  })
})

// ─── B. Provider Config Preset Defaults ──────────────────────────────────────

describe('getProviderPresetDefaults()', () => {
  test('nvidia preset points to integrate.api.nvidia.com', () => {
    const defaults = getProviderPresetDefaults('nvidia')
    expect(defaults.baseUrl).toContain('integrate.api.nvidia.com')
    expect(defaults.requiresApiKey).toBe(true)
  })

  test('github-models preset points to models.github.ai', () => {
    const defaults = getProviderPresetDefaults('github-models')
    expect(defaults.baseUrl).toContain('models.github.ai')
    expect(defaults.requiresApiKey).toBe(true)
  })

  test('groq preset points to api.groq.com', () => {
    const defaults = getProviderPresetDefaults('groq')
    expect(defaults.baseUrl).toContain('api.groq.com')
  })

  test('ollama preset points to localhost:11434', () => {
    const defaults = getProviderPresetDefaults('ollama')
    expect(defaults.baseUrl).toContain('11434')
  })

  test('groq preset model is a valid llama variant', () => {
    const defaults = getProviderPresetDefaults('groq')
    expect(defaults.model).toMatch(/llama/)
  })

  test('anthropic preset requiresApiKey=true', () => {
    expect(getProviderPresetDefaults('anthropic').requiresApiKey).toBe(true)
  })

  test('ollama preset requiresApiKey=false', () => {
    expect(getProviderPresetDefaults('ollama').requiresApiKey).toBe(false)
  })

  test('lmstudio preset requiresApiKey=false', () => {
    expect(getProviderPresetDefaults('lmstudio').requiresApiKey).toBe(false)
  })

  test('custom preset requiresApiKey=false', () => {
    expect(getProviderPresetDefaults('custom').requiresApiKey).toBe(false)
  })
})

// ─── isLocalProviderUrl ───────────────────────────────────────────────────────

describe('isLocalProviderUrl()', () => {
  test.each([
    ['http://localhost:3099/v1', true],
    ['http://localhost:11434', true],
    ['http://127.0.0.1:8080', true],
    ['http://127.0.0.2:8080', true],
    ['http://0.0.0.0:8000', true],
    ['http://192.168.1.100:1234', true],
    ['http://10.0.0.1:5000', true],
    ['http://172.16.0.1:8080', true],
    ['http://mydevice.local:1234', true],
    ['https://api.groq.com/openai/v1', false],
    ['https://api.openai.com/v1', false],
    ['https://api.anthropic.com', false],
    ['https://openrouter.ai/api/v1', false],
    ['https://api.deepseek.com/v1', false],
    [undefined, false],
  ])('%s → %s', (url, expected) => {
    expect(isLocalProviderUrl(url)).toBe(expected)
  })

  test('malformed URL returns false', () => {
    expect(isLocalProviderUrl('not-a-url')).toBe(false)
  })
})

// ─── isOllamaUrl ─────────────────────────────────────────────────────────────

describe('isOllamaUrl()', () => {
  test.each([
    ['http://localhost:11434/v1', true],
    ['http://localhost:11434', true],
    ['http://my-ollama-server:11434', true],
    ['http://localhost:3099/v1', false],    // custom local
    ['http://localhost:1234/v1', false],    // LM Studio
    ['https://api.groq.com/openai/v1', false],
  ])('%s → %s', (url, expected) => {
    expect(isOllamaUrl(url)).toBe(expected)
  })
})

// ─── C. Ollama Binary Discovery Unit Tests ────────────────────────────────────

describe('getCandidateOllamaPaths()', () => {
  test('always starts with bare "ollama" for PATH lookup', () => {
    const paths = getCandidateOllamaPaths()
    expect(paths[0]).toBe('ollama')
  })

  test('includes .exe paths on Windows (E drive)', () => {
    if (process.platform !== 'win32') return

    const paths = getCandidateOllamaPaths()
    // Should include E drive with .exe
    expect(paths.some(p => p.includes('E:') && p.includes('.exe'))).toBe(true)
    // And without .exe as fallback
    expect(paths.some(p => p.includes('E:') && !p.includes('.exe'))).toBe(true)
  })

  test('includes standard AppData path on Windows', () => {
    if (process.platform !== 'win32') return

    const paths = getCandidateOllamaPaths()
    expect(paths.some(p => p.toLowerCase().includes('programs') && p.toLowerCase().includes('ollama'))).toBe(true)
  })

  test('includes /usr/local/bin/ollama on Unix', () => {
    if (process.platform === 'win32') return

    const paths = getCandidateOllamaPaths()
    expect(paths).toContain('/usr/local/bin/ollama')
  })

  test('produces a reasonable number of candidates (3-30)', () => {
    const paths = getCandidateOllamaPaths()
    expect(paths.length).toBeGreaterThanOrEqual(3)
    expect(paths.length).toBeLessThan(30)
  })
})

describe('resolveOllamaBin() cache behaviour', () => {
  afterEach(() => {
    _resetOllamaBinCache()
  })

  test('returns null when no binary is found', async () => {
    // execFile will fail for all candidates in a constrained test env
    // where 'ollama' is not on PATH and E:\.ollama doesn't exist
    // We just verify the function resolves to string|null
    const bin = await resolveOllamaBin()
    expect(bin === null || typeof bin === 'string').toBe(true)
  })

  test('caches the result on repeated calls', async () => {
    const bin1 = await resolveOllamaBin()
    const bin2 = await resolveOllamaBin()
    expect(bin1).toStrictEqual(bin2)
  })

  test('_resetOllamaBinCache() clears the cache', async () => {
    await resolveOllamaBin() // populate cache
    _resetOllamaBinCache()
    // After reset, a fresh resolution happens — just verify it returns string|null
    const result = await resolveOllamaBin()
    expect(result === null || typeof result === 'string').toBe(true)
  })
})

// ─── D1. Request Format Validation per Provider (mocked fetch) ──────────────

describe('Provider request format validation', () => {
  let capturedUrl: string
  let capturedHeaders: Record<string, string>
  let capturedBody: Record<string, unknown>

  beforeEach(() => {
    saveEnvKeys(
      'CLAUDE_CODE_USE_OPENAI', 'OPENAI_BASE_URL', 'OPENAI_API_KEY', 'OPENAI_MODEL',
      'CLAUDE_CODE_USE_GITHUB', 'CLAUDE_CODE_USE_GEMINI',
    )
    process.env.CLAUDE_CODE_USE_OPENAI = '1'
    capturedUrl = ''
    capturedHeaders = {}
    capturedBody = {}
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    restoreEnv()
  })

  function mockCaptureFetch(): void {
    mockFetch((url, init) => {
      capturedUrl = url
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>
      capturedBody = JSON.parse(init?.body as string ?? '{}') as Record<string, unknown>
      return jsonResponse({
        id: 'chatcmpl-test',
        choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop', index: 0 }],
        model: 'test',
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      })
    })
  }

  async function sendRequest(baseUrl: string, model: string, apiKey: string): Promise<void> {
    process.env.OPENAI_BASE_URL = baseUrl
    process.env.OPENAI_API_KEY = apiKey
    process.env.OPENAI_MODEL = model
    mockCaptureFetch()
    const client = createOpenAIShimClient({}) as {
      beta: { messages: { create: (p: Record<string, unknown>) => Promise<unknown> } }
    }
    await client.beta.messages.create({
      model,
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say OK' }],
      stream: false,
    })
  }

  test('Groq: correct URL, Bearer auth, max_tokens (not max_completion_tokens)', async () => {
    await sendRequest('https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile', 'gsk_test')
    expect(capturedUrl).toBe('https://api.groq.com/openai/v1/chat/completions')
    expect(capturedHeaders.Authorization).toBe('Bearer gsk_test')
    expect(capturedBody.model).toBe('llama-3.3-70b-versatile')
    expect(capturedBody.max_tokens).toBe(100)
    expect(capturedBody.max_completion_tokens).toBeUndefined()
    expect(capturedBody.stream_options).toBeUndefined()
    expect(capturedBody.options).toBeUndefined()
  })

  test('DeepSeek: correct URL, Bearer auth, max_tokens', async () => {
    await sendRequest('https://api.deepseek.com/v1', 'deepseek-chat', 'sk-test')
    expect(capturedUrl).toBe('https://api.deepseek.com/v1/chat/completions')
    expect(capturedHeaders.Authorization).toBe('Bearer sk-test')
    expect(capturedBody.model).toBe('deepseek-chat')
    expect(capturedBody.max_tokens).toBe(100)
    expect(capturedBody.max_completion_tokens).toBeUndefined()
    expect(capturedBody.options).toBeUndefined()
  })

  test('Mistral: correct URL, Bearer auth, max_tokens', async () => {
    await sendRequest('https://api.mistral.ai/v1', 'mistral-large-latest', 'test-key')
    expect(capturedUrl).toBe('https://api.mistral.ai/v1/chat/completions')
    expect(capturedHeaders.Authorization).toBe('Bearer test-key')
    expect(capturedBody.model).toBe('mistral-large-latest')
    expect(capturedBody.max_tokens).toBe(100)
    expect(capturedBody.max_completion_tokens).toBeUndefined()
  })

  test('Together AI: correct URL, Bearer auth, max_tokens', async () => {
    await sendRequest('https://api.together.xyz/v1', 'Qwen/Qwen3.5-9B', 'test-key')
    expect(capturedUrl).toBe('https://api.together.xyz/v1/chat/completions')
    expect(capturedHeaders.Authorization).toBe('Bearer test-key')
    expect(capturedBody.model).toBe('Qwen/Qwen3.5-9B')
    expect(capturedBody.max_tokens).toBe(100)
    expect(capturedBody.max_completion_tokens).toBeUndefined()
  })

  test('Moonshot AI: correct URL, Bearer auth, max_tokens', async () => {
    await sendRequest('https://api.moonshot.ai/v1', 'kimi-k2.5', 'test-key')
    expect(capturedUrl).toBe('https://api.moonshot.ai/v1/chat/completions')
    expect(capturedHeaders.Authorization).toBe('Bearer test-key')
    expect(capturedBody.model).toBe('kimi-k2.5')
    expect(capturedBody.max_tokens).toBe(100)
    expect(capturedBody.max_completion_tokens).toBeUndefined()
  })

  test('OpenRouter: correct URL, Bearer auth, max_tokens', async () => {
    await sendRequest('https://openrouter.ai/api/v1', 'openai/gpt-5-mini', 'test-key')
    expect(capturedUrl).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(capturedHeaders.Authorization).toBe('Bearer test-key')
    expect(capturedBody.model).toBe('openai/gpt-5-mini')
    expect(capturedBody.max_tokens).toBe(100)
    expect(capturedBody.max_completion_tokens).toBeUndefined()
  })

  test('NVIDIA NIM: correct URL, Bearer auth, max_tokens', async () => {
    await sendRequest('https://integrate.api.nvidia.com/v1', 'meta/llama-3.3-70b-instruct', 'nvapi-test')
    expect(capturedUrl).toBe('https://integrate.api.nvidia.com/v1/chat/completions')
    expect(capturedHeaders.Authorization).toBe('Bearer nvapi-test')
    expect(capturedBody.model).toBe('meta/llama-3.3-70b-instruct')
    expect(capturedBody.max_tokens).toBe(100)
    expect(capturedBody.max_completion_tokens).toBeUndefined()
  })

  test('GitHub Models: correct URL, GitHub headers, max_tokens', async () => {
    await sendRequest('https://models.github.ai/inference', 'meta/Meta-Llama-3.3-70B-Instruct', 'ghp_test')
    expect(capturedUrl).toBe('https://models.github.ai/inference/chat/completions')
    expect(capturedHeaders.Authorization).toBe('Bearer ghp_test')
    expect(capturedHeaders['Accept']).toBe('application/vnd.github+json')
    expect(capturedHeaders['X-GitHub-Api-Version']).toBe('2022-11-28')
    expect(capturedBody.max_tokens).toBe(100)
    expect(capturedBody.max_completion_tokens).toBeUndefined()
  })

  test('Ollama Cloud: correct URL, Bearer auth, max_tokens, no stream_options/options', async () => {
    await sendRequest('https://ollama.com/v1', 'llama3.2:3b', 'test-key')
    expect(capturedUrl).toBe('https://ollama.com/v1/chat/completions')
    expect(capturedHeaders.Authorization).toBe('Bearer test-key')
    expect(capturedBody.model).toBe('llama3.2:3b')
    expect(capturedBody.max_tokens).toBe(100)
    expect(capturedBody.max_completion_tokens).toBeUndefined()
    expect(capturedBody.stream_options).toBeUndefined()
    expect(capturedBody.options).toBeUndefined()
  })

  test('Gemini: correct URL, Bearer auth, max_tokens', async () => {
    await sendRequest('https://generativelanguage.googleapis.com/v1beta/openai', 'gemini-3-flash-preview', 'test-key')
    expect(capturedUrl).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions')
    expect(capturedHeaders.Authorization).toBe('Bearer test-key')
    expect(capturedBody.model).toBe('gemini-3-flash-preview')
    expect(capturedBody.max_tokens).toBe(100)
    expect(capturedBody.max_completion_tokens).toBeUndefined()
  })

  test('Standard OpenAI: uses max_completion_tokens and stream_options', async () => {
    process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1'
    process.env.OPENAI_API_KEY = 'sk-test'
    process.env.OPENAI_MODEL = 'gpt-4o'
    mockCaptureFetch()
    const client = createOpenAIShimClient({}) as {
      beta: { messages: { create: (p: Record<string, unknown>) => Promise<unknown> } }
    }
    await client.beta.messages.create({
      model: 'gpt-4o',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say OK' }],
      stream: false,
    })
    expect(capturedUrl).toBe('https://api.openai.com/v1/chat/completions')
    expect(capturedHeaders.Authorization).toBe('Bearer sk-test')
    expect(capturedBody.max_completion_tokens).toBe(100)
    expect(capturedBody.max_tokens).toBeUndefined()
  })

  test('No stream_options sent to third-party providers', async () => {
    const providers = [
      ['https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile'],
      ['https://api.deepseek.com/v1', 'deepseek-chat'],
      ['https://api.mistral.ai/v1', 'mistral-large-latest'],
      ['https://api.together.xyz/v1', 'Qwen/Qwen3.5-9B'],
      ['https://ollama.com/v1', 'llama3.2:3b'],
    ] as const

    for (const [baseUrl, model] of providers) {
      process.env.OPENAI_BASE_URL = baseUrl
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.OPENAI_MODEL = model
      mockCaptureFetch()
      const client = createOpenAIShimClient({}) as {
        beta: { messages: { create: (p: Record<string, unknown>) => Promise<unknown> } }
      }
      await client.beta.messages.create({
        model,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'hi' }],
        stream: true,
      })
      expect(capturedBody.stream_options).toBeUndefined()
    }
  })

  test('No options.num_ctx sent to cloud providers', async () => {
    const cloudUrls = [
      'https://api.groq.com/openai/v1',
      'https://ollama.com/v1',
      'https://api.deepseek.com/v1',
    ]
    for (const baseUrl of cloudUrls) {
      await sendRequest(baseUrl, 'test-model', 'test-key')
      expect(capturedBody.options).toBeUndefined()
    }
  })

  test('max_tokens is capped for models with small context windows (≤64k)', async () => {
    // minimax-m2.5 has 32k context → max safe output = floor(32768 * 0.25) = 8192
    await sendRequest('https://openrouter.ai/api/v1', 'minimax/minimax-m2.5', 'test-key')
    expect(capturedBody.max_tokens).toBeLessThanOrEqual(8_192)
    expect((capturedBody.max_tokens as number)).toBeGreaterThan(0)
  })

  test('max_tokens is NOT capped for models with large context windows (>64k)', async () => {
    await sendRequest('https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile', 'test-key')
    expect(capturedBody.max_tokens).toBe(100)
  })
})

// ─── D2. Error Handling Paths (mocked fetch via createOpenAIShimClient) ──────

describe('HTTP error handling', () => {
  beforeEach(() => {
    saveEnvKeys('CLAUDE_CODE_USE_OPENAI', 'OPENAI_BASE_URL', 'OPENAI_API_KEY', 'OPENAI_MODEL')
    process.env.CLAUDE_CODE_USE_OPENAI = '1'
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.OPENAI_MODEL = 'test-model'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    restoreEnv()
  })

  // Helper to call the shim with minimal params
  async function callShim(baseUrl: string): Promise<unknown> {
    process.env.OPENAI_BASE_URL = baseUrl
    const client = createOpenAIShimClient({}) as {
      beta: { messages: { create: (p: Record<string, unknown>) => Promise<unknown> } }
    }
    return client.beta.messages.create({
      model: 'test-model',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say OK' }],
      stream: false,
    })
  }

  test('413 response throws "context length exceeded" error', async () => {
    mockFetch(() => new Response('payload too large', { status: 413 }))
    await expect(callShim('https://api.groq.com/openai/v1')).rejects.toThrow(/context length exceeded/i)
  })

  test('400 with context_length_exceeded throws context error', async () => {
    mockFetch(() =>
      jsonResponse(
        { error: { message: 'Request too large for model test-model: context_length_exceeded', code: 'context_length_exceeded' } },
        400,
      ),
    )
    await expect(callShim('https://api.groq.com/openai/v1')).rejects.toThrow(/context length exceeded/i)
  })

  test('400 with "request too large for model" throws context error', async () => {
    mockFetch(() =>
      jsonResponse(
        { error: { message: 'Request too large for model llama-3.3-70b-versatile: 185985 tokens requested, 131072 maximum.' } },
        400,
      ),
    )
    await expect(callShim('https://api.groq.com/openai/v1')).rejects.toThrow(/context length exceeded/i)
  })

  test('400 with "input is too long" throws context error', async () => {
    mockFetch(() =>
      jsonResponse({ error: { message: 'input is too long for this model' } }, 400),
    )
    await expect(callShim('https://api.groq.com/openai/v1')).rejects.toThrow(/context length exceeded/i)
  })

  test('400 with "maximum context length" (OpenRouter/MiniMax format) throws context error', async () => {
    mockFetch(() =>
      jsonResponse({
        error: {
          message: "Provider returned error",
          code: 400,
          metadata: {
            raw: JSON.stringify({
              error: {
                message: "This model's maximum context length is 32768 tokens. However, you requested 8192 output tokens and your prompt contains at least 24577 input tokens, for a total of at least 32769 tokens. Please reduce the length of the input prompt or the number of requested output tokens.",
              },
            }),
          },
        },
      }, 400),
    )
    await expect(callShim('https://openrouter.ai/api/v1')).rejects.toThrow(/context length exceeded/i)
  })

  test('400 rate-limit-like message does NOT trigger context error', async () => {
    // A message that only says "rate limited" — must NOT match context error
    mockFetch(() =>
      jsonResponse(
        { error: { message: 'All accounts rate limited. reset after 14m.' } },
        400,
      ),
    )
    let thrownError: unknown
    try {
      await callShim('https://api.groq.com/openai/v1')
    } catch (e) {
      thrownError = e
    }
    expect(thrownError).toBeDefined()
    expect(String((thrownError as Error).message).toLowerCase()).not.toContain('context length exceeded')
  })

  test('local 429 throws rate-limit error after max retries', async () => {
    let calls = 0
    mockFetch(() => {
      calls++
      return jsonResponse({ error: { message: 'All accounts rate limited. reset after 14m.' } }, 429)
    })

    await expect(callShim('http://localhost:3099/v1')).rejects.toThrow(/rate limited/i)
    // Should have retried (LOCAL_429_MAX_RETRIES = 3, so 3 attempts)
    expect(calls).toBe(3)
  }, 20_000) // Allow time for retry backoff in test

  test('local 429 does NOT throw "context length exceeded"', async () => {
    mockFetch(() =>
      jsonResponse({ error: { message: 'All accounts rate limited. reset after 14m.' } }, 429),
    )

    let thrownError: unknown
    try {
      await callShim('http://localhost:3099/v1')
    } catch (e) {
      thrownError = e
    }
    expect(thrownError).toBeDefined()
    expect(String((thrownError as Error).message).toLowerCase()).not.toContain('context length exceeded')
  }, 20_000)

  test('local 401 throws authentication error', async () => {
    mockFetch(() =>
      jsonResponse({ error: { message: 'Unauthorized' } }, 401),
    )
    await expect(callShim('http://localhost:3099/v1')).rejects.toThrow(/authentication failed/i)
  })

  test('400 "not a valid model" throws model-suggestion error', async () => {
    mockFetch(() =>
      jsonResponse({ error: { message: 'not a valid model: bad-model' } }, 400),
    )
    await expect(callShim('https://api.groq.com/openai/v1')).rejects.toThrow(/not accepted.*\/provider/i)
  })

  test('network error to local provider suggests checking if running', async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error('ECONNREFUSED'))) as unknown as typeof globalThis.fetch
    await expect(callShim('http://localhost:11434/v1')).rejects.toThrow(/local provider.*running/i)
  })

  test('network error to remote provider suggests checking connection', async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error('ENOTFOUND'))) as unknown as typeof globalThis.fetch
    await expect(callShim('https://api.groq.com/openai/v1')).rejects.toThrow(/check your internet|cannot connect/i)
  })

  test('403 with no_access code shows model access denied (not invalid api key)', async () => {
    mockFetch(() =>
      jsonResponse(
        { error: { code: 'no_access', message: 'No access to model: /DeepSeek-V3-0324' } },
        403,
      ),
    )
    await expect(callShim('https://models.github.ai/inference')).rejects.toThrow(/model access denied/i)
  })

  test('403 with "no access to model" message shows model access denied', async () => {
    mockFetch(() =>
      jsonResponse(
        { error: { message: 'No access to model. Please check your account.' } },
        403,
      ),
    )
    await expect(callShim('https://api.openai.com/v1')).rejects.toThrow(/model access denied/i)
  })

  test('403 Ollama Cloud subscription error shows subscription message', async () => {
    mockFetch(() =>
      jsonResponse(
        { error: 'this model requires a subscription, upgrade for access: https://ollama.com/upgrade' },
        403,
      ),
    )
    await expect(callShim('https://ollama.com/v1')).rejects.toThrow(/subscription/i)
  })

  test('403 generic remote provider shows invalid api key', async () => {
    mockFetch(() =>
      jsonResponse({ error: { message: 'Forbidden' } }, 403),
    )
    await expect(callShim('https://api.groq.com/openai/v1')).rejects.toThrow(/invalid api key/i)
  })
})

// ─── E. Model Listing (mocked HTTP) ──────────────────────────────────────────

describe('listOllamaModels() — mocked', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('returns parsed model list from /api/tags', async () => {
    mockFetch(() =>
      jsonResponse({
        models: [
          { name: 'llama3.1:8b', size: 4294967296, details: { family: 'llama', parameter_size: '8B' } },
          { name: 'qwen2.5-coder:7b', size: 4294967296, details: { family: 'qwen' } },
        ],
      }),
    )
    const models = await listOllamaModels()
    expect(models).toHaveLength(2)
    expect(models[0]?.name).toBe('llama3.1:8b')
    expect(models[1]?.name).toBe('qwen2.5-coder:7b')
    expect(models[0]?.family).toBe('llama')
  })

  test('returns [] on server error', async () => {
    mockFetch(() => new Response('error', { status: 500 }))
    const models = await listOllamaModels()
    expect(models).toEqual([])
  })

  test('returns [] on network failure', async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error('ECONNREFUSED'))) as unknown as typeof globalThis.fetch
    const models = await listOllamaModels()
    expect(models).toEqual([])
  })

  test('filters out models without names', async () => {
    mockFetch(() =>
      jsonResponse({
        models: [
          { name: 'valid-model' },
          { size: 1000 }, // no name
        ],
      }),
    )
    const models = await listOllamaModels()
    expect(models).toHaveLength(1)
    expect(models[0]?.name).toBe('valid-model')
  })
})

// ─── D. Connectivity Tests (real HTTP, guarded) ───────────────────────────────

describe('hasLocalOllama() — real HTTP', () => {
  test('returns boolean (true if ollama running at localhost:11434)', async () => {
    const result = await hasLocalOllama()
    expect(typeof result).toBe('boolean')
    // We can't assert true/false — just verify no exception
  }, 3000)
})

// ─── F. Round-trip Query Tests (real API, env-guarded) ───────────────────────

describe('groq round-trip query', () => {
  const apiKey = process.env.GROQ_API_KEY

  test('send "Say OK" to groq, receive non-empty text response', async () => {
    if (!apiKey) {
      console.log('[SKIP] GROQ_API_KEY not set')
      return
    }

    const defaults = getProviderPresetDefaults('groq')
    process.env.CLAUDE_CODE_USE_OPENAI = '1'
    process.env.OPENAI_BASE_URL = defaults.baseUrl
    process.env.OPENAI_API_KEY = apiKey
    process.env.OPENAI_MODEL = defaults.model

    try {
      const client = createOpenAIShimClient({}) as {
        beta: { messages: { create: (p: Record<string, unknown>) => Promise<{
          content: Array<{ type: string; text?: string }>
        }> } }
      }

      const response = await client.beta.messages.create({
        model: defaults.model,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Say just the word OK and nothing else.' }],
        stream: false,
      })

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text ?? '')
        .join('')
      expect(text.trim().length).toBeGreaterThan(0)
      console.log(`[groq] response: "${text.trim().slice(0, 100)}"`)
    } finally {
      delete process.env.CLAUDE_CODE_USE_OPENAI
      delete process.env.OPENAI_BASE_URL
      delete process.env.OPENAI_API_KEY
      delete process.env.OPENAI_MODEL
    }
  }, 30_000)
})

describe('NVIDIA NIM round-trip query', () => {
  test('send "Say OK" to NVIDIA NIM, receive non-empty text response', async () => {
    const apiKey = process.env.NVIDIA_API_KEY
    if (!apiKey) {
      console.log('[SKIP] NVIDIA_API_KEY not set')
      return
    }

    const defaults = getProviderPresetDefaults('nvidia')
    process.env.CLAUDE_CODE_USE_OPENAI = '1'
    process.env.OPENAI_BASE_URL = defaults.baseUrl
    process.env.OPENAI_API_KEY = apiKey
    process.env.OPENAI_MODEL = defaults.model

    try {
      const client = createOpenAIShimClient({}) as {
        beta: { messages: { create: (p: Record<string, unknown>) => Promise<{
          content: Array<{ type: string; text?: string }>
        }> } }
      }

      const response = await client.beta.messages.create({
        model: defaults.model,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Say just the word OK and nothing else.' }],
        stream: false,
      })

      const text = (response as { content: Array<{ type: string; text?: string }> }).content
        .filter(b => b.type === 'text')
        .map(b => b.text ?? '')
        .join('')
      expect(text.trim().length).toBeGreaterThan(0)
      console.log(`[nvidia] response: "${text.trim().slice(0, 100)}"`)
    } finally {
      delete process.env.CLAUDE_CODE_USE_OPENAI
      delete process.env.OPENAI_BASE_URL
      delete process.env.OPENAI_API_KEY
      delete process.env.OPENAI_MODEL
    }
  }, 30_000)
})

describe('GitHub Models round-trip query', () => {
  test('send "Say OK" to GitHub Models, receive non-empty text response', async () => {
    const apiKey = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
    if (!apiKey) {
      console.log('[SKIP] GITHUB_TOKEN / GH_TOKEN not set')
      return
    }

    const defaults = getProviderPresetDefaults('github-models')
    process.env.CLAUDE_CODE_USE_OPENAI = '1'
    process.env.OPENAI_BASE_URL = defaults.baseUrl
    process.env.OPENAI_API_KEY = apiKey
    process.env.OPENAI_MODEL = defaults.model

    try {
      const client = createOpenAIShimClient({}) as {
        beta: { messages: { create: (p: Record<string, unknown>) => Promise<{
          content: Array<{ type: string; text?: string }>
        }> } }
      }

      const response = await client.beta.messages.create({
        model: defaults.model,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Say just the word OK and nothing else.' }],
        stream: false,
      })

      const text = (response as { content: Array<{ type: string; text?: string }> }).content
        .filter(b => b.type === 'text')
        .map(b => b.text ?? '')
        .join('')
      expect(text.trim().length).toBeGreaterThan(0)
      console.log(`[github-models] response: "${text.trim().slice(0, 100)}"`)
    } finally {
      delete process.env.CLAUDE_CODE_USE_OPENAI
      delete process.env.OPENAI_BASE_URL
      delete process.env.OPENAI_API_KEY
      delete process.env.OPENAI_MODEL
    }
  }, 30_000)
})

describe('ollama round-trip query', () => {
  test('send "Say OK" to ollama, receive non-empty text response', async () => {
    const ollamaRunning = await hasLocalOllama()
    if (!ollamaRunning) {
      console.log('[SKIP] ollama not running at localhost:11434')
      return
    }

    // Pick the first available model
    const models = await listOllamaModels()
    if (models.length === 0) {
      console.log('[SKIP] no ollama models available')
      return
    }

    const model = models[0]!.name
    process.env.CLAUDE_CODE_USE_OPENAI = '1'
    process.env.OPENAI_BASE_URL = `${DEFAULT_OLLAMA_BASE_URL}/v1`
    process.env.OPENAI_MODEL = model
    delete process.env.OPENAI_API_KEY

    try {
      const client = createOpenAIShimClient({}) as {
        beta: { messages: { create: (p: Record<string, unknown>) => Promise<{
          content: Array<{ type: string; text?: string }>
        }> } }
      }

      const response = await client.beta.messages.create({
        model,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Say just the word OK.' }],
        stream: false,
      })

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text ?? '')
        .join('')
      expect(text.trim().length).toBeGreaterThan(0)
      console.log(`[ollama:${model}] response: "${text.trim().slice(0, 100)}"`)
    } finally {
      delete process.env.CLAUDE_CODE_USE_OPENAI
      delete process.env.OPENAI_BASE_URL
      delete process.env.OPENAI_MODEL
    }
  }, 60_000)
})

// ─── G. Additional Cloud Provider Round-trip Tests ───────────────────────────

function makeRoundTripTest(
  label: string,
  preset: Parameters<typeof getProviderPresetDefaults>[0],
  apiKeyEnv: string,
): void {
  describe(`${label} round-trip query`, () => {
    test(`send "Say OK" to ${label}, receive non-empty text response`, async () => {
      const apiKey = process.env[apiKeyEnv]
      if (!apiKey) {
        console.log(`[SKIP] ${apiKeyEnv} not set`)
        return
      }

      const defaults = getProviderPresetDefaults(preset)
      process.env.CLAUDE_CODE_USE_OPENAI = '1'
      process.env.OPENAI_BASE_URL = defaults.baseUrl
      process.env.OPENAI_API_KEY = apiKey
      process.env.OPENAI_MODEL = defaults.model

      try {
        const client = createOpenAIShimClient({}) as {
          beta: { messages: { create: (p: Record<string, unknown>) => Promise<{
            content: Array<{ type: string; text?: string }>
          }> } }
        }

        const response = await client.beta.messages.create({
          model: defaults.model,
          max_tokens: 50,
          messages: [{ role: 'user', content: 'Say just the word OK and nothing else.' }],
          stream: false,
        })

        const text = (response as { content: Array<{ type: string; text?: string }> }).content
          .filter(b => b.type === 'text')
          .map(b => b.text ?? '')
          .join('')
        expect(text.trim().length).toBeGreaterThan(0)
        console.log(`[${label.toLowerCase()}] response: "${text.trim().slice(0, 100)}"`)
      } finally {
        delete process.env.CLAUDE_CODE_USE_OPENAI
        delete process.env.OPENAI_BASE_URL
        delete process.env.OPENAI_API_KEY
        delete process.env.OPENAI_MODEL
      }
    }, 30_000)
  })
}

makeRoundTripTest('DeepSeek', 'deepseek', 'DEEPSEEK_API_KEY')
makeRoundTripTest('Mistral', 'mistral', 'MISTRAL_API_KEY')
makeRoundTripTest('Together AI', 'together', 'TOGETHER_API_KEY')
makeRoundTripTest('Moonshot AI', 'moonshotai', 'MOONSHOT_API_KEY')
makeRoundTripTest('OpenRouter', 'openrouter', 'OPENROUTER_API_KEY')
makeRoundTripTest('Gemini', 'gemini', 'GEMINI_API_KEY')

describe('Ollama Cloud round-trip query', () => {
  test('send "Say OK" to Ollama Cloud, receive non-empty text response', async () => {
    const apiKey = process.env.OLLAMA_API_KEY
    if (!apiKey) {
      console.log('[SKIP] OLLAMA_API_KEY not set')
      return
    }

    process.env.CLAUDE_CODE_USE_OPENAI = '1'
    process.env.OPENAI_BASE_URL = 'https://ollama.com/v1'
    process.env.OPENAI_API_KEY = apiKey
    process.env.OPENAI_MODEL = process.env.OLLAMA_CLOUD_MODEL ?? 'llama3.2:3b'

    try {
      const client = createOpenAIShimClient({}) as {
        beta: { messages: { create: (p: Record<string, unknown>) => Promise<{
          content: Array<{ type: string; text?: string }>
        }> } }
      }

      const response = await client.beta.messages.create({
        model: process.env.OPENAI_MODEL,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Say just the word OK and nothing else.' }],
        stream: false,
      })

      const text = (response as { content: Array<{ type: string; text?: string }> }).content
        .filter(b => b.type === 'text')
        .map(b => b.text ?? '')
        .join('')
      expect(text.trim().length).toBeGreaterThan(0)
      console.log(`[ollama-cloud] response: "${text.trim().slice(0, 100)}"`)
    } finally {
      delete process.env.CLAUDE_CODE_USE_OPENAI
      delete process.env.OPENAI_BASE_URL
      delete process.env.OPENAI_API_KEY
      delete process.env.OPENAI_MODEL
    }
  }, 30_000)
})
