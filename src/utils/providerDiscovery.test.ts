import { afterEach, expect, mock, test } from 'bun:test'

import {
  DEFAULT_OLLAMA_NUM_CTX,
  getLocalOpenAICompatibleProviderLabel,
  listOpenAICompatibleModels,
  resolveOllamaContextLength,
} from './providerDiscovery.js'

const originalFetch = globalThis.fetch
const originalEnv = {
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OLLAMA_CONTEXT_LENGTH: process.env.OLLAMA_CONTEXT_LENGTH,
}

afterEach(() => {
  globalThis.fetch = originalFetch
  process.env.OPENAI_BASE_URL = originalEnv.OPENAI_BASE_URL
  if (originalEnv.OLLAMA_CONTEXT_LENGTH === undefined) {
    delete process.env.OLLAMA_CONTEXT_LENGTH
  } else {
    process.env.OLLAMA_CONTEXT_LENGTH = originalEnv.OLLAMA_CONTEXT_LENGTH
  }
})

test('resolveOllamaContextLength: defaults to 32k when unset', () => {
  delete process.env.OLLAMA_CONTEXT_LENGTH
  expect(resolveOllamaContextLength()).toBe(DEFAULT_OLLAMA_NUM_CTX)
  expect(DEFAULT_OLLAMA_NUM_CTX).toBeGreaterThanOrEqual(32_768)
})

test('resolveOllamaContextLength: honors a sane user override', () => {
  process.env.OLLAMA_CONTEXT_LENGTH = '65536'
  expect(resolveOllamaContextLength()).toBe(65_536)
})

test('resolveOllamaContextLength: rejects too-small / garbage overrides', () => {
  // Below the floor — would still overflow NeoCode's system prompt + tools.
  process.env.OLLAMA_CONTEXT_LENGTH = '2048'
  expect(resolveOllamaContextLength()).toBe(DEFAULT_OLLAMA_NUM_CTX)
  // Non-numeric (e.g. a Windows shell writing the literal "undefined").
  process.env.OLLAMA_CONTEXT_LENGTH = 'undefined'
  expect(resolveOllamaContextLength()).toBe(DEFAULT_OLLAMA_NUM_CTX)
  process.env.OLLAMA_CONTEXT_LENGTH = 'not-a-number'
  expect(resolveOllamaContextLength()).toBe(DEFAULT_OLLAMA_NUM_CTX)
})

test('lists models from a local openai-compatible /models endpoint', async () => {
  globalThis.fetch = mock((input, init) => {
    const url = typeof input === 'string' ? input : input.url
    expect(url).toBe('http://localhost:1234/v1/models')
    expect(init?.headers).toEqual({ Authorization: 'Bearer local-key' })

    return Promise.resolve(
      new Response(
        JSON.stringify({
          data: [
            { id: 'qwen2.5-coder-7b-instruct' },
            { id: 'llama-3.2-3b-instruct' },
            { id: 'qwen2.5-coder-7b-instruct' },
          ],
        }),
        { status: 200 },
      ),
    )
  }) as typeof globalThis.fetch

  await expect(
    listOpenAICompatibleModels({
      baseUrl: 'http://localhost:1234/v1',
      apiKey: 'local-key',
    }),
  ).resolves.toEqual([
    'qwen2.5-coder-7b-instruct',
    'llama-3.2-3b-instruct',
  ])
})

test('returns null when a local openai-compatible /models request fails', async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(new Response('not available', { status: 503 })),
  ) as typeof globalThis.fetch

  await expect(
    listOpenAICompatibleModels({ baseUrl: 'http://localhost:1234/v1' }),
  ).resolves.toBeNull()
})

test('detects LM Studio from the default localhost port', () => {
  expect(getLocalOpenAICompatibleProviderLabel('http://localhost:1234/v1')).toBe(
    'LM Studio',
  )
})

test('detects common local openai-compatible providers by hostname', () => {
  expect(
    getLocalOpenAICompatibleProviderLabel('http://localai.local:8080/v1'),
  ).toBe('LocalAI')
  expect(
    getLocalOpenAICompatibleProviderLabel('http://vllm.local:8000/v1'),
  ).toBe('vLLM')
})

test('falls back to a generic local openai-compatible label', () => {
  expect(
    getLocalOpenAICompatibleProviderLabel('http://127.0.0.1:8080/v1'),
  ).toBe('Local OpenAI-compatible')
})