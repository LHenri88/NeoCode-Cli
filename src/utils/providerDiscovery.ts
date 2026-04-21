import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import type { OllamaModelDescriptor } from './providerRecommendation.ts'
import { DEFAULT_OPENAI_BASE_URL } from '../services/api/providerConfig.js'

const execFileAsync = promisify(execFile)

export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434'
export const DEFAULT_ATOMIC_CHAT_BASE_URL = 'http://127.0.0.1:1337'

function withTimeoutSignal(timeoutMs: number): {
  signal: AbortSignal
  clear: () => void
} {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export function getOllamaApiBaseUrl(baseUrl?: string): string {
  const parsed = new URL(
    baseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL,
  )
  const pathname = trimTrailingSlash(parsed.pathname)
  parsed.pathname = pathname.endsWith('/v1')
    ? pathname.slice(0, -3) || '/'
    : pathname || '/'
  parsed.search = ''
  parsed.hash = ''
  return trimTrailingSlash(parsed.toString())
}

export function getOllamaChatBaseUrl(baseUrl?: string): string {
  return `${getOllamaApiBaseUrl(baseUrl)}/v1`
}

export function getAtomicChatApiBaseUrl(baseUrl?: string): string {
  const parsed = new URL(
    baseUrl || process.env.ATOMIC_CHAT_BASE_URL || DEFAULT_ATOMIC_CHAT_BASE_URL,
  )
  const pathname = trimTrailingSlash(parsed.pathname)
  parsed.pathname = pathname.endsWith('/v1')
    ? pathname.slice(0, -3) || '/'
    : pathname || '/'
  parsed.search = ''
  parsed.hash = ''
  return trimTrailingSlash(parsed.toString())
}

export function getAtomicChatChatBaseUrl(baseUrl?: string): string {
  return `${getAtomicChatApiBaseUrl(baseUrl)}/v1`
}

export function getOpenAICompatibleModelsBaseUrl(baseUrl?: string): string {
  return (
    baseUrl || process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL
  ).replace(/\/+$/, '')
}

export function getLocalOpenAICompatibleProviderLabel(baseUrl?: string): string {
  try {
    const parsed = new URL(getOpenAICompatibleModelsBaseUrl(baseUrl))
    const host = parsed.host.toLowerCase()
    const hostname = parsed.hostname.toLowerCase()
    const path = parsed.pathname.toLowerCase()
    const haystack = `${hostname} ${path}`

    if (
      host.endsWith(':1234') ||
      haystack.includes('lmstudio') ||
      haystack.includes('lm-studio')
    ) {
      return 'LM Studio'
    }
    if (host.endsWith(':11434') || haystack.includes('ollama')) {
      return 'Ollama'
    }
    if (haystack.includes('localai')) {
      return 'LocalAI'
    }
    if (haystack.includes('jan')) {
      return 'Jan'
    }
    if (haystack.includes('kobold')) {
      return 'KoboldCpp'
    }
    if (haystack.includes('llama.cpp') || haystack.includes('llamacpp')) {
      return 'llama.cpp'
    }
    if (haystack.includes('vllm')) {
      return 'vLLM'
    }
    if (
      haystack.includes('open-webui') ||
      haystack.includes('openwebui')
    ) {
      return 'Open WebUI'
    }
    if (
      haystack.includes('text-generation-webui') ||
      haystack.includes('oobabooga')
    ) {
      return 'text-generation-webui'
    }
  } catch {
    // Fall back to the generic label when the base URL is malformed.
  }

  return 'Local OpenAI-compatible'
}

export async function hasLocalOllama(baseUrl?: string): Promise<boolean> {
  const { signal, clear } = withTimeoutSignal(1200)
  try {
    const response = await fetch(`${getOllamaApiBaseUrl(baseUrl)}/api/tags`, {
      method: 'GET',
      signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    clear()
  }
}

export async function listOllamaModels(
  baseUrl?: string,
): Promise<OllamaModelDescriptor[]> {
  const { signal, clear } = withTimeoutSignal(5000)
  try {
    const response = await fetch(`${getOllamaApiBaseUrl(baseUrl)}/api/tags`, {
      method: 'GET',
      signal,
    })
    if (!response.ok) {
      return []
    }

    const data = (await response.json()) as {
      models?: Array<{
        name?: string
        size?: number
        details?: {
          family?: string
          families?: string[]
          parameter_size?: string
          quantization_level?: string
        }
      }>
    }

    return (data.models ?? [])
      .filter(model => Boolean(model.name))
      .map(model => ({
        name: model.name!,
        sizeBytes: typeof model.size === 'number' ? model.size : null,
        family: model.details?.family ?? null,
        families: model.details?.families ?? [],
        parameterSize: model.details?.parameter_size ?? null,
        quantizationLevel: model.details?.quantization_level ?? null,
      }))
  } catch {
    return []
  } finally {
    clear()
  }
}

// ─── Ollama binary / install helpers ─────────────────────────────────────────

/**
 * Returns a prioritised list of candidate paths for the ollama binary.
 * Covers: PATH, standard Windows AppData installs, and common alternative
 * drive locations used when Windows is configured with separate system/data drives.
 *
 * On Windows we always use shell:true when executing (see resolveOllamaBin),
 * so paths do NOT need the .exe suffix — the shell handles extension resolution.
 * However we also include explicit .exe variants as extras because some Node.js
 * environments (Bun) behave differently with execFile + absolute paths.
 */
export function getCandidateOllamaPaths(): string[] {
  const candidates: string[] = ['ollama']

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA ?? ''
    const userProfile  = process.env.USERPROFILE  ?? ''
    const username     = process.env.USERNAME      ?? 'Administrator'

    // Standard installer location
    if (localAppData) {
      candidates.push(`${localAppData}\\Programs\\Ollama\\ollama.exe`)
      candidates.push(`${localAppData}\\Programs\\Ollama\\ollama`)
    }
    if (userProfile) {
      candidates.push(`${userProfile}\\AppData\\Local\\Programs\\Ollama\\ollama.exe`)
    }

    // Alternative drive letters — common when users redirect installs to D:, E:, etc.
    for (const drive of ['C', 'D', 'E', 'F', 'G']) {
      // Squirrel/portable-style install at root of drive (e.g. E:\.ollama\Ollama\ollama.exe)
      candidates.push(`${drive}:\\.ollama\\Ollama\\ollama.exe`)
      candidates.push(`${drive}:\\.ollama\\Ollama\\ollama`)
      // Per-user AppData on another drive
      candidates.push(`${drive}:\\Users\\${username}\\AppData\\Local\\Programs\\Ollama\\ollama.exe`)
    }
  } else {
    // macOS / Linux standard locations
    candidates.push('/usr/local/bin/ollama')
    candidates.push('/usr/bin/ollama')
    const home = process.env.HOME ?? ''
    if (home) candidates.push(`${home}/.local/bin/ollama`)
  }

  return candidates
}

// Cached result: undefined = not yet resolved, null = not found, string = resolved path
let _resolvedOllamaBin: string | null | undefined = undefined

/** Reset the cache (used in tests). */
export function _resetOllamaBinCache(): void {
  _resolvedOllamaBin = undefined
}

/**
 * Find the first working ollama binary from the candidate list.
 * Result is cached for the process lifetime.
 *
 * On Windows we always use shell:true so the OS can resolve both PATH entries
 * and absolute paths with or without the .exe extension.
 */
export async function resolveOllamaBin(): Promise<string | null> {
  if (_resolvedOllamaBin !== undefined) return _resolvedOllamaBin

  // On Windows, always use shell so the OS handles .exe resolution and PATH lookup.
  // On Unix, shell is unnecessary — execFile resolves absolute paths directly.
  const useShell = process.platform === 'win32'

  for (const bin of getCandidateOllamaPaths()) {
    try {
      await execFileAsync(bin, ['--version'], { timeout: 3000, shell: useShell })
      _resolvedOllamaBin = bin
      return bin
    } catch {
      // try next candidate
    }
  }

  _resolvedOllamaBin = null
  return null
}

/**
 * Returns true if the `ollama` CLI binary can be found (PATH or common install paths).
 */
export async function isOllamaInstalled(): Promise<boolean> {
  return (await resolveOllamaBin()) !== null
}

/**
 * List models the user has already pulled, using `ollama list`.
 * Falls back to the HTTP /api/tags endpoint if the CLI call fails or binary not found.
 */
export async function listOllamaModelsFromCLI(): Promise<OllamaModelDescriptor[]> {
  const bin = await resolveOllamaBin()
  // If the binary is not found, skip the CLI attempt and go straight to HTTP.
  if (!bin) return listOllamaModels()
  try {
    const useShell = process.platform === 'win32'
    const { stdout } = await execFileAsync(bin, ['list'], { timeout: 8000, shell: useShell })
    // Output format: NAME  ID  SIZE  MODIFIED  (first line is header)
    const lines = stdout.trim().split('\n').slice(1)
    const models: OllamaModelDescriptor[] = lines
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const cols = line.split(/\s{2,}/)   // two+ spaces as delimiter
        const name = (cols[0] ?? '').trim()
        const size = (cols[2] ?? '').trim() // e.g. "4.7 GB"
        return {
          name,
          sizeBytes: null,
          family: null,
          families: [],
          parameterSize: size || null,
          quantizationLevel: null,
        }
      })
      .filter(m => m.name && m.name !== 'NAME')
    return models.length > 0 ? models : listOllamaModels()
  } catch {
    return listOllamaModels()
  }
}

/**
 * Start `ollama serve` in the background (fire-and-forget).
 * Safe to call even when serve is already running.
 * Uses the cached resolved binary path so it works when ollama is not on PATH.
 */
export function startOllamaServeBackground(): void {
  // Prefer the previously resolved path (set by isOllamaInstalled / listOllamaModelsFromCLI).
  // Fall back to PATH and then each candidate so the call is always attempt-based.
  const binsToTry =
    _resolvedOllamaBin
      ? [_resolvedOllamaBin]
      : getCandidateOllamaPaths()

  for (const bin of binsToTry) {
    try {
      const child = spawn(bin, ['serve'], {
        detached: true,
        stdio: 'ignore',
        shell: process.platform === 'win32',
      })
      child.unref()
      // spawn() doesn't throw on a missing binary — it emits 'error'.
      // We stop after the first successful spawn attempt (already-running
      // case is fine — ollama exits gracefully when serve is already up).
      return
    } catch {
      // continue to next candidate
    }
  }
}

/**
 * Install Ollama via the official install script (Linux/macOS).
 * Returns 'success', 'windows' (unsupported), or 'error:<msg>'.
 */
export async function installOllama(): Promise<'success' | 'windows' | `error:${string}`> {
  if (process.platform === 'win32') return 'windows'
  return new Promise(resolve => {
    const child = spawn('sh', ['-c', 'curl -fsSL https://ollama.ai/install.sh | sh'], {
      stdio: 'inherit',
      detached: false,
    })
    child.on('close', code => {
      resolve(code === 0 ? 'success' : `error:exit ${code}`)
    })
    child.on('error', err => resolve(`error:${err.message}`))
  })
}

/**
 * Exit the current Ink TUI and respawn the CLI process from scratch.
 * The child inherits the updated process.env (already patched by applyProviderProfileToProcessEnv).
 *
 * @param skipOllamaServe - Set to true when using Ollama Cloud (no local daemon needed).
 */
export function respawnCLI(skipOllamaServe = false): void {
  // Release terminal from raw-mode so the new process gets a clean start
  try { (process.stdin as NodeJS.ReadStream & { setRawMode?: (v: boolean) => void }).setRawMode?.(false) } catch {}
  process.stdin.pause()

  if (!skipOllamaServe) {
    startOllamaServeBackground()
  }

  setTimeout(() => {
    const [bin, ...args] = process.argv as string[]
    const child = spawn(bin!, args, {
      env: process.env,
      stdio: 'inherit',
      detached: false,
    })
    // When the child exits, propagate its exit code and terminate the parent.
    // Do NOT call process.exit(0) before this — doing so kills the terminal
    // on Windows before the child has a chance to take over stdin/stdout.
    child.on('close', (code: number | null) => process.exit(code ?? 0))
    child.on('error', () => process.exit(1))
  }, 350)
}

export async function listOpenAICompatibleModels(options?: {
  baseUrl?: string
  apiKey?: string
}): Promise<string[] | null> {
  const { signal, clear } = withTimeoutSignal(5000)
  try {
    const response = await fetch(
      `${getOpenAICompatibleModelsBaseUrl(options?.baseUrl)}/models`,
      {
        method: 'GET',
        headers: options?.apiKey
          ? {
              Authorization: `Bearer ${options.apiKey}`,
            }
          : undefined,
        signal,
      },
    )
    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as {
      data?: Array<{ id?: string }>
    }

    return Array.from(
      new Set(
        (data.data ?? [])
          .filter(model => Boolean(model.id))
          .map(model => model.id!),
      ),
    )
  } catch {
    return null
  } finally {
    clear()
  }
}

export async function hasLocalAtomicChat(baseUrl?: string): Promise<boolean> {
  const { signal, clear } = withTimeoutSignal(1200)
  try {
    const response = await fetch(`${getAtomicChatChatBaseUrl(baseUrl)}/models`, {
      method: 'GET',
      signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    clear()
  }
}

export async function listAtomicChatModels(
  baseUrl?: string,
): Promise<string[]> {
  const { signal, clear } = withTimeoutSignal(5000)
  try {
    const response = await fetch(`${getAtomicChatChatBaseUrl(baseUrl)}/models`, {
      method: 'GET',
      signal,
    })
    if (!response.ok) {
      return []
    }

    const data = (await response.json()) as {
      data?: Array<{ id?: string }>
    }

    return (data.data ?? [])
      .filter(model => Boolean(model.id))
      .map(model => model.id!)
  } catch {
    return []
  } finally {
    clear()
  }
}

// ─── OpenRouter ───────────────────────────────────────────────────────────────

export type OpenRouterModel = {
  id: string
  name: string
  isFree: boolean
  contextLength?: number
}

// Coding-focused models ranked by benchmark performance.
// Base IDs without :free/:extended suffix — used for priority matching.
const OPENROUTER_CODING_PRIORITY = [
  // Free tier
  'qwen/qwen3-coder',
  'google/gemma-4-31b-it',
  'google/gemma-4-26b-a4b-it',
  'qwen/qwen3-next-80b-a3b-instruct',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'meta-llama/llama-3.3-70b-instruct',
  'qwen/qwen3-235b-a22b',
  'deepseek/deepseek-r1',
  'minimax/minimax-m1',
  // Paid tier
  'anthropic/claude-opus-4-6',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-sonnet-4-6',
  'anthropic/claude-sonnet-4.6',
  'deepseek/deepseek-v3.2',
  'deepseek/deepseek-chat-v3.1',
  'deepseek/deepseek-chat',
  'openai/gpt-4.1',
  'openai/gpt-4o',
  'google/gemini-2.5-pro-preview',
  'google/gemini-2.5-flash-preview',
]

function baseModelId(id: string): string {
  return id.replace(/:free$|:extended$|:beta$|:online$|:nitro$/, '')
}

function rankOpenRouterModels(models: OpenRouterModel[]): OpenRouterModel[] {
  const getPriority = (m: OpenRouterModel): number => {
    const base = baseModelId(m.id)
    const idx = OPENROUTER_CODING_PRIORITY.indexOf(base)
    return idx === -1 ? 999 : idx
  }
  const free = models.filter(m => m.isFree).sort((a, b) => getPriority(a) - getPriority(b))
  const paid = models.filter(m => !m.isFree).sort((a, b) => getPriority(a) - getPriority(b))
  return [...free, ...paid]
}

export async function listOpenRouterModels(
  apiKey: string,
): Promise<{ models: OpenRouterModel[]; error?: string }> {
  const { signal, clear } = withTimeoutSignal(10000)
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    })
    if (!response.ok) {
      return {
        models: [],
        error: response.status === 401 ? 'Invalid API key' : `API error: ${response.status}`,
      }
    }

    const data = (await response.json()) as {
      data?: Array<{
        id?: string
        name?: string
        pricing?: { prompt?: string; completion?: string }
        context_length?: number
      }>
    }

    const all: OpenRouterModel[] = (data.data ?? [])
      .filter(m => Boolean(m.id))
      .map(m => ({
        id: m.id!,
        name: m.name ?? m.id!,
        isFree: m.pricing?.prompt === '0' && m.pricing?.completion === '0',
        contextLength: m.context_length,
      }))

    return { models: rankOpenRouterModels(all) }
  } catch (e) {
    return { models: [], error: e instanceof Error ? e.message : 'Network error' }
  } finally {
    clear()
  }
}

// ─── Ollama Cloud ─────────────────────────────────────────────────────────────
// API endpoint: https://ollama.com/v1  (OpenAI-compatible)
// Auth: Authorization: Bearer <OLLAMA_API_KEY>
// Example: curl https://ollama.com/v1/chat/completions -H "Authorization: Bearer KEY" -d '{"model":"gpt-oss:120b","messages":[...]}'

export const OLLAMA_CLOUD_BASE_URL = 'https://ollama.com'

/**
 * Rank priority for known Ollama Cloud models (lower index = higher rank).
 * Model names are the plain API names as used in https://ollama.com/v1/models.
 */
const OLLAMA_CLOUD_MODEL_RANK: Record<string, string> = {
  'devstral-2':            'Devstral 2 — agentic coding by Mistral ★',
  'devstral-small-2':      'Devstral Small 2 — compact agentic coding ★',
  'qwen3-coder-next':      'Qwen3 Coder Next — top cloud coding model ★',
  'qwen3.5':               'Qwen 3.5 — Alibaba flagship',
  'qwen3-next':            'Qwen3 Next — latest Qwen reasoning',
  'gpt-oss:120b':          'GPT-OSS 120B — OpenAI open-source large',
  'gpt-oss:20b':           'GPT-OSS 20B — OpenAI open-source compact',
  'deepseek-v3.2':         'DeepSeek V3.2 — strong coding + reasoning',
  'deepseek-v3.1:671b':    'DeepSeek V3.1 671B — massive reasoning',
  'kimi-k2.5':             'Kimi K2.5 — Moonshot long context ★',
  'cogito-2.1':            'Cogito 2.1 — advanced reasoning',
  'gemini-3-flash-preview':'Gemini 3 Flash Preview — Google fast model',
  'gemma4':                'Gemma 4 — Google open model',
  'glm-5.1':               'GLM-5.1 — Zhipu flagship',
  'glm-5':                 'GLM-5 — Zhipu general model',
  'glm-4.7':               'GLM-4.7 — Zhipu efficient model',
  'minimax-m2.7':          'MiniMax M2.7 — large MoE model',
  'minimax-m2.5':          'MiniMax M2.5 — balanced MoE',
  'minimax-m2':            'MiniMax M2 — fast MoE',
  'ministral-3':           'Ministral 3 — compact Mistral',
  'nemotron-3-super':      'Nemotron 3 Super — NVIDIA large',
  'nemotron-3-nano':       'Nemotron 3 Nano — NVIDIA compact',
  'rnj-1':                 'RNJ-1 — reasoning model',
}

/** Curated fallback list (shown when API call fails/no key entered yet).
 *  Plain model names as returned by https://ollama.com/v1/models. */
export const OLLAMA_CLOUD_MODELS: Array<{ value: string; description: string }> = [
  { value: 'devstral-2',            description: 'Devstral 2 — agentic coding by Mistral ★' },
  { value: 'devstral-small-2',      description: 'Devstral Small 2 — compact agentic coding ★' },
  { value: 'qwen3-coder-next',      description: 'Qwen3 Coder Next — top cloud coding model ★' },
  { value: 'qwen3.5',               description: 'Qwen 3.5 — Alibaba flagship' },
  { value: 'qwen3-next',            description: 'Qwen3 Next — latest Qwen reasoning' },
  { value: 'gpt-oss:120b',          description: 'GPT-OSS 120B — OpenAI open-source large' },
  { value: 'gpt-oss:20b',           description: 'GPT-OSS 20B — OpenAI open-source compact' },
  { value: 'deepseek-v3.2',         description: 'DeepSeek V3.2 — strong coding + reasoning' },
  { value: 'kimi-k2.5',             description: 'Kimi K2.5 — Moonshot long context ★' },
  { value: 'cogito-2.1',            description: 'Cogito 2.1 — advanced reasoning' },
  { value: 'gemini-3-flash-preview',description: 'Gemini 3 Flash Preview — Google fast model' },
  { value: 'gemma4',                description: 'Gemma 4 — Google open model' },
  { value: 'glm-5.1',              description: 'GLM-5.1 — Zhipu flagship' },
  { value: 'glm-5',                description: 'GLM-5 — Zhipu general model' },
  { value: 'minimax-m2.7',          description: 'MiniMax M2.7 — large MoE model' },
  { value: 'minimax-m2.5',          description: 'MiniMax M2.5 — balanced MoE' },
  { value: 'ministral-3',           description: 'Ministral 3 — compact Mistral' },
  { value: 'nemotron-3-super',      description: 'Nemotron 3 Super — NVIDIA large' },
  { value: 'nemotron-3-nano',       description: 'Nemotron 3 Nano — NVIDIA compact' },
  { value: 'rnj-1',                 description: 'RNJ-1 — reasoning model' },
]

/** Rank keys list for ordering known models first. */
const OLLAMA_CLOUD_RANK_ORDER = Object.keys(OLLAMA_CLOUD_MODEL_RANK)

function rankOllamaCloudModels(
  ids: string[],
): Array<{ value: string; description: string }> {
  const known: Array<{ value: string; description: string }> = []
  const unknown: Array<{ value: string; description: string }> = []

  for (const id of ids) {
    const desc = OLLAMA_CLOUD_MODEL_RANK[id]
    if (desc) {
      known.push({ value: id, description: desc })
    } else {
      unknown.push({ value: id, description: id })
    }
  }

  known.sort((a, b) => {
    const ai = OLLAMA_CLOUD_RANK_ORDER.indexOf(a.value)
    const bi = OLLAMA_CLOUD_RANK_ORDER.indexOf(b.value)
    return ai - bi
  })
  unknown.sort((a, b) => a.value.localeCompare(b.value))

  return [...known, ...unknown]
}

/**
 * Fetch models from the Ollama cloud API in real time.
 * Tries the OpenAI-compatible /v1/models endpoint first, then the native
 * Ollama /api/tags endpoint as fallback. Falls back to the static
 * OLLAMA_CLOUD_MODELS list if both fail or return no results.
 */
export async function listOllamaCloudModels(
  apiKey: string,
): Promise<Array<{ value: string; description: string }>> {
  const headers = { Authorization: `Bearer ${apiKey}` }

  // Try OpenAI-compatible endpoint
  try {
    const { signal, clear } = withTimeoutSignal(8000)
    try {
      const response = await fetch(`${OLLAMA_CLOUD_BASE_URL}/v1/models`, {
        method: 'GET',
        headers,
        signal,
      })
      if (response.ok) {
        const data = (await response.json()) as {
          data?: Array<{ id: string }>
          models?: Array<{ name?: string; model?: string }>
        }
        // OpenAI format: { data: [{ id }] }
        const openaiIds = (data.data ?? []).map(m => m.id).filter(Boolean)
        if (openaiIds.length > 0) return rankOllamaCloudModels(openaiIds)
        // Native Ollama format: { models: [{ name }] }
        const ollamaIds = (data.models ?? []).map(m => m.name ?? m.model ?? '').filter(Boolean)
        if (ollamaIds.length > 0) return rankOllamaCloudModels(ollamaIds)
      }
    } finally {
      clear()
    }
  } catch {
    // fall through
  }

  // Try native Ollama tags endpoint
  try {
    const { signal, clear } = withTimeoutSignal(8000)
    try {
      const response = await fetch(`${OLLAMA_CLOUD_BASE_URL}/api/tags`, {
        method: 'GET',
        headers,
        signal,
      })
      if (response.ok) {
        const data = (await response.json()) as {
          models?: Array<{ name?: string; model?: string }>
        }
        const ids = (data.models ?? []).map(m => m.name ?? m.model ?? '').filter(Boolean)
        if (ids.length > 0) return rankOllamaCloudModels(ids)
      }
    } finally {
      clear()
    }
  } catch {
    // fall through to static list
  }

  return OLLAMA_CLOUD_MODELS
}

// ─── Generic preset model fetching ───────────────────────────────────────────

export type DynamicModel = { value: string; description: string }
export type FetchModelsResult = { models: DynamicModel[]; error?: string }

/** Known coding-relevant prefixes/IDs for filtering generic provider responses. */
const OPENAI_CHAT_PREFIXES = ['gpt-', 'o1', 'o3', 'o4', 'chatgpt', 'codex', 'text-davinci']

/** Fetch models from an OpenAI-compatible /v1/models endpoint with Bearer auth. */
async function fetchOpenAICompatibleModels(
  baseUrl: string,
  apiKey: string,
  filterFn?: (id: string) => boolean,
  timeoutMs = 8000,
): Promise<FetchModelsResult> {
  const { signal, clear } = withTimeoutSignal(timeoutMs)
  try {
    const res = await fetch(`${trimTrailingSlash(baseUrl)}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    })
    if (!res.ok) return { models: [], error: `API error ${res.status}: ${res.statusText}` }
    const data = (await res.json()) as { data?: Array<{ id: string; type?: string }> }
    const ids = (data.data ?? [])
      .map(m => m.id)
      .filter(Boolean)
      .filter(filterFn ?? (() => true))
    return { models: ids.map(id => ({ value: id, description: id })) }
  } catch (e) {
    return { models: [], error: e instanceof Error ? e.message : 'Network error' }
  } finally {
    clear()
  }
}

/** Fetch models for a given provider preset using that provider's API. */
export async function fetchModelsForPreset(
  preset: string,
  apiKey: string,
): Promise<FetchModelsResult> {
  switch (preset) {
    case 'openai': {
      const { models, error } = await fetchOpenAICompatibleModels(
        'https://api.openai.com/v1',
        apiKey,
        id => OPENAI_CHAT_PREFIXES.some(p => id.startsWith(p)),
      )
      if (error) return { models, error }
      // Sort: newer/better models first
      const ranked = models.sort((a, b) => {
        const priority = ['gpt-5', 'o4', 'o3', 'gpt-4.1', 'gpt-4o', 'gpt-4', 'o1', 'gpt-3']
        const ai = priority.findIndex(p => a.value.startsWith(p))
        const bi = priority.findIndex(p => b.value.startsWith(p))
        if (ai === -1 && bi === -1) return a.value.localeCompare(b.value)
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
      return { models: ranked }
    }

    case 'deepseek':
      return fetchOpenAICompatibleModels('https://api.deepseek.com/v1', apiKey)

    case 'groq':
      return fetchOpenAICompatibleModels(
        'https://api.groq.com/openai/v1',
        apiKey,
        id => !id.includes('whisper') && !id.includes('tts'),
      )

    case 'mistral':
      return fetchOpenAICompatibleModels('https://api.mistral.ai/v1', apiKey)

    case 'together': {
      const { signal, clear } = withTimeoutSignal(8000)
      try {
        const res = await fetch('https://api.together.xyz/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal,
        })
        if (!res.ok) return { models: [], error: `API error ${res.status}` }
        const data = (await res.json()) as Array<{ id: string; type?: string; display_name?: string }> | { data?: Array<{ id: string; type?: string; display_name?: string }> }
        const rawList = Array.isArray(data) ? data : (data.data ?? [])
        const chatModels = rawList.filter(m => !m.type || m.type === 'chat' || m.type === 'language')
        return {
          models: chatModels.map(m => ({
            value: m.id,
            description: m.display_name ?? m.id,
          })),
        }
      } catch (e) {
        return { models: [], error: e instanceof Error ? e.message : 'Network error' }
      } finally {
        clear()
      }
    }

    case 'moonshotai':
      return fetchOpenAICompatibleModels('https://api.moonshot.cn/v1', apiKey)

    case 'gemini': {
      const { signal, clear } = withTimeoutSignal(8000)
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=50`,
          { signal },
        )
        if (!res.ok) return { models: [], error: `API error ${res.status}` }
        const data = (await res.json()) as { models?: Array<{ name: string; displayName?: string; description?: string }> }
        const models = (data.models ?? [])
          .filter(m => m.name && !m.name.includes('embedding') && !m.name.includes('aqa'))
          .map(m => ({
            value: m.name.replace('models/', ''),
            description: m.displayName ?? m.name.replace('models/', ''),
          }))
        return { models }
      } catch (e) {
        return { models: [], error: e instanceof Error ? e.message : 'Network error' }
      } finally {
        clear()
      }
    }

    case 'anthropic': {
      const { signal, clear } = withTimeoutSignal(8000)
      try {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          signal,
        })
        if (!res.ok) return { models: [], error: `API error ${res.status}` }
        const data = (await res.json()) as { data?: Array<{ id: string; display_name?: string }> }
        const models = (data.data ?? []).map(m => ({
          value: m.id,
          description: m.display_name ?? m.id,
        }))
        return { models }
      } catch (e) {
        return { models: [], error: e instanceof Error ? e.message : 'Network error' }
      } finally {
        clear()
      }
    }

    default:
      return { models: [], error: 'No API model listing for this provider' }
  }
}

// ─── gqwen-auth (Qwen proxy) ──────────────────────────────────────────────────
// Proxy runs at http://localhost:3099/v1 (OpenAI-compatible)
// Install: bun install -g gqwen-auth
// Auth:    gqwen add         (opens browser for Qwen OAuth)
// Start:   gqwen serve on    (background daemon)
// Models:  gqwen models

export const GQWEN_PROXY_BASE_URL = 'http://localhost:3099'
export const GQWEN_DEFAULT_MODEL = 'qwen3-coder-plus'

/**
 * Resolve the gqwen binary path. Tries, in order:
 *  1. Global PATH (gqwen / gqwen.exe)
 *  2. ~/.bun/bin/gqwen (bun global install)
 *  3. node_modules/.bin/gqwen (project dependency)
 *  4. node_modules/gqwen-auth/dist/gqwen (direct)
 */
function getGqwenBin(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? ''
  const candidates = [
    'gqwen',
    `${home}/.bun/bin/gqwen`,
    './node_modules/.bin/gqwen',
    './node_modules/gqwen-auth/dist/gqwen',
  ]
  // Return the first string that the OS can resolve; we can't test synchronously
  // so we return them in priority order — callers use shell:true for PATH resolution
  return candidates[0]!
}

/** Check whether the gqwen CLI is available. */
export async function isGqwenInstalled(): Promise<boolean> {
  const candidates = [
    'gqwen',
    `${process.env.HOME ?? process.env.USERPROFILE ?? ''}/.bun/bin/gqwen`,
    './node_modules/.bin/gqwen',
    './node_modules/gqwen-auth/dist/gqwen',
  ]
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ['--version'], { timeout: 3000, shell: process.platform === 'win32' })
      return true
    } catch {
      // try next
    }
  }
  return false
}

/**
 * Install gqwen-auth globally using Bun.
 * Returns { success, error }.
 */
export function installGqwenAuth(): Promise<{ success: boolean; error?: string }> {
  return new Promise(resolve => {
    const child = spawn('bun', ['install', '--global', 'gqwen-auth'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    })
    let stderr = ''
    child.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })
    child.on('close', code => resolve({ success: code === 0, error: code !== 0 ? stderr.trim() : undefined }))
    child.on('error', err => resolve({ success: false, error: err.message }))
  })
}

/**
 * Run `gqwen add` to authenticate via browser OAuth.
 * Captures stdout/stderr — gqwen add opens browser automatically and exits when done.
 * Returns { success, output } so the caller can display relevant messages.
 */
export function runGqwenAdd(): Promise<{ success: boolean; output: string }> {
  return new Promise(resolve => {
    const bin = getGqwenBin()
    const child = spawn(bin, ['add'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    })
    let output = ''
    child.stdout?.on('data', (d: Buffer) => { output += d.toString() })
    child.stderr?.on('data', (d: Buffer) => { output += d.toString() })
    child.on('close', code => resolve({ success: code === 0, output: output.trim() }))
    child.on('error', err => resolve({ success: false, output: err.message }))
  })
}

/**
 * Check whether any Qwen accounts are configured in gqwen.
 * Returns true if at least one account exists.
 */
export function hasGqwenAccounts(): Promise<boolean> {
  return new Promise(resolve => {
    const bin = getGqwenBin()
    const child = spawn(bin, ['list'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    })
    let output = ''
    child.stdout?.on('data', (d: Buffer) => { output += d.toString() })
    child.on('close', () => {
      // If output contains an email-like string or account info, accounts exist
      resolve(output.trim().length > 0 && !output.includes('No accounts'))
    })
    child.on('error', () => resolve(false))
  })
}

/** Check whether the gqwen proxy is currently running. */
export async function isGqwenProxyRunning(): Promise<boolean> {
  const { signal, clear } = withTimeoutSignal(2000)
  try {
    const res = await fetch(`${GQWEN_PROXY_BASE_URL}/v1/models`, { signal })
    return res.ok
  } catch {
    return false
  } finally {
    clear()
  }
}

/** Start the gqwen proxy in the background (fire-and-forget). */
export function startGqwenServeBackground(): void {
  const bin = getGqwenBin()
  try {
    spawn(bin, ['serve', 'on'], {
      detached: true,
      stdio: 'ignore',
      shell: process.platform === 'win32',
    }).unref()
  } catch {
    // ignore — already running or binary missing
  }
}

/** List models available from the running gqwen proxy. */
export async function listGqwenModels(): Promise<FetchModelsResult> {
  return fetchOpenAICompatibleModels(`${GQWEN_PROXY_BASE_URL}/v1`, '', () => true, 5000)
}

// ─── Ollama suggested models to pull ─────────────────────────────────────────

export const SUGGESTED_OLLAMA_MODELS: Array<{ name: string; description: string }> = [
  { name: 'qwen2.5-coder:7b', description: 'Qwen 2.5 Coder 7B — best small coding model (~4 GB)' },
  { name: 'llama3.3', description: 'Llama 3.3 70B — best general + coding (~40 GB)' },
  { name: 'deepseek-r1:7b', description: 'DeepSeek R1 7B — reasoning model (~5 GB)' },
  { name: 'phi4', description: 'Phi-4 14B — small but highly capable (~9 GB)' },
  { name: 'gemma3:12b', description: 'Gemma 3 12B — balanced quality (~7 GB)' },
  { name: 'qwen2.5-coder:32b', description: 'Qwen 2.5 Coder 32B — large coding model (~19 GB)' },
  { name: 'devstral', description: 'Devstral 24B — agentic coding by Mistral (~14 GB)' },
]

export async function benchmarkOllamaModel(
  modelName: string,
  baseUrl?: string,
): Promise<number | null> {
  const start = Date.now()
  const { signal, clear } = withTimeoutSignal(20000)
  try {
    const response = await fetch(`${getOllamaApiBaseUrl(baseUrl)}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify({
        model: modelName,
        stream: false,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        options: {
          temperature: 0,
          num_predict: 8,
        },
      }),
    })
    if (!response.ok) {
      return null
    }
    await response.json()
    return Date.now() - start
  } catch {
    return null
  } finally {
    clear()
  }
}
