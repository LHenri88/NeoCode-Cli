import figures from 'figures'
import * as React from 'react'
import { Box, Text } from '../ink.js'
import { useKeybinding } from '../keybindings/useKeybinding.js'
import type { ProviderProfile } from '../utils/config.js'
import {
  addProviderProfile,
  applyActiveProviderProfileFromConfig,
  deleteProviderProfile,
  getActiveProviderProfile,
  getProviderPresetDefaults,
  getProviderProfiles,
  setActiveProviderProfile,
  type ProviderPreset,
  type ProviderProfileInput,
  updateProviderProfile,
} from '../utils/providerProfiles.js'
import {
  clearGithubModelsToken,
  GITHUB_MODELS_HYDRATED_ENV_MARKER,
  hydrateGithubModelsTokenFromSecureStorage,
  readGithubModelsToken,
  readGithubModelsTokenAsync,
} from '../utils/githubModelsCredentials.js'
import { isEnvTruthy } from '../utils/envUtils.js'
import { updateSettingsForSource } from '../utils/settings/settings.js'
import {
  isOllamaInstalled,
  listOllamaModelsFromCLI,
  listOllamaCloudModels,
  installOllama,
  respawnCLI,
  listOpenRouterModels,
  fetchModelsForPreset,
  isGqwenInstalled,
  installGqwenAuth,
  runGqwenAdd,
  hasGqwenAccounts,
  isGqwenProxyRunning,
  startGqwenServeBackground,
  listGqwenModels,
  GQWEN_PROXY_BASE_URL,
  GQWEN_DEFAULT_MODEL,
  SUGGESTED_OLLAMA_MODELS,
  OLLAMA_CLOUD_BASE_URL,
  DEFAULT_OLLAMA_BASE_URL,
  type OpenRouterModel,
  type DynamicModel,
} from '../utils/providerDiscovery.js'
import { rankOllamaModels } from '../utils/providerRecommendation.js'
import type { OllamaModelDescriptor } from '../utils/providerRecommendation.js'
import { useSetAppState } from '../state/AppState.js'
import { Select } from './CustomSelect/index.js'
import { Pane } from './design-system/Pane.js'
import TextInput from './TextInput.js'

export type ProviderManagerResult = {
  action: 'saved' | 'cancelled'
  activeProfileId?: string
  message?: string
}

type Props = {
  mode: 'first-run' | 'manage'
  onDone: (result?: ProviderManagerResult) => void
}

type Screen =
  | 'menu'
  | 'select-preset'
  | 'form'
  | 'ollama-setup'
  | 'openrouter-setup'
  | 'preset-api-setup'
  | 'qwen-setup'
  | 'select-active'
  | 'select-edit'
  | 'select-delete'

type DraftField = 'name' | 'baseUrl' | 'model' | 'apiKey'

type ProviderDraft = Record<DraftField, string>

const FORM_STEPS: Array<{
  key: DraftField
  label: string
  placeholder: string
  helpText: string
  optional?: boolean
}> = [
    {
      key: 'name',
      label: 'Provider name',
      placeholder: 'e.g. Ollama Home, OpenAI Work',
      helpText: 'A short label shown in /provider and startup setup.',
    },
    {
      key: 'baseUrl',
      label: 'Base URL',
      placeholder: 'e.g. http://localhost:11434/v1',
      helpText: 'API base URL used for this provider profile.',
    },
    {
      key: 'model',
      label: 'Default model',
      placeholder: 'e.g. llama3.1:8b',
      helpText: 'Model name to use when this provider is active.',
    },
    {
      key: 'apiKey',
      label: 'API key',
      placeholder: 'Leave empty if your provider does not require one',
      helpText: 'Optional. Press Enter with empty value to skip.',
      optional: true,
    },
  ]

const GITHUB_PROVIDER_ID = '__github_models__'
const GITHUB_PROVIDER_LABEL = 'GitHub Models'
const GITHUB_PROVIDER_DEFAULT_MODEL = 'github:copilot'
const GITHUB_PROVIDER_DEFAULT_BASE_URL = 'https://models.github.ai/inference'

const CUSTOM_MODEL_OPTION = '__custom__'

// Models per preset ranked by coding performance
const PRESET_MODEL_OPTIONS: Partial<Record<ProviderPreset, Array<{ value: string; description: string }>>> = {
  anthropic: [
    { value: 'claude-opus-4-6', description: 'Most capable — complex reasoning & coding (recommended)' },
    { value: 'claude-sonnet-4-6', description: 'Balanced performance and speed' },
    { value: 'claude-haiku-4-5-20251001', description: 'Fastest and most affordable' },
  ],
  openai: [
    { value: 'gpt-4.1', description: 'GPT-4.1 — best general + coding (recommended)' },
    { value: 'gpt-4o', description: 'GPT-4o — versatile, strong all-rounder' },
    { value: 'o4-mini', description: 'o4-mini — advanced reasoning, fast' },
    { value: 'gpt-4o-mini', description: 'GPT-4o mini — fast and cost-effective' },
    { value: 'codexplan', description: 'Codex Plan (gpt-5.4) — agentic coding [Codex access required]' },
    { value: 'gpt-5.3-codex', description: 'GPT-5.3 Codex — top agentic coding [Codex access required]' },
    { value: 'gpt-5.1-codex-mini', description: 'GPT-5.1 Codex Mini — fast coding agent [Codex access required]' },
  ],
  gemini: [
    { value: 'gemini-2.5-pro-preview-06-05', description: 'Gemini 2.5 Pro — best quality (recommended)' },
    { value: 'gemini-2.5-flash-preview-05-20', description: 'Gemini 2.5 Flash — fast and capable' },
    { value: 'gemini-2.0-flash', description: 'Gemini 2.0 Flash — balanced' },
    { value: 'gemini-1.5-pro', description: 'Gemini 1.5 Pro — long context' },
    { value: 'gemini-1.5-flash', description: 'Gemini 1.5 Flash — efficient' },
  ],
  deepseek: [
    { value: 'deepseek-chat', description: 'DeepSeek V3 — excellent coding (recommended)' },
    { value: 'deepseek-reasoner', description: 'DeepSeek R1 — reasoning model' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', description: 'Llama 3.3 70B — best quality (recommended)' },
    { value: 'llama-3.1-8b-instant', description: 'Llama 3.1 8B Instant — ultra fast' },
    { value: 'mixtral-8x7b-32768', description: 'Mixtral 8x7B — long context window' },
    { value: 'gemma2-9b-it', description: 'Gemma 2 9B — lightweight' },
  ],
  mistral: [
    { value: 'mistral-large-latest', description: 'Mistral Large — best quality (recommended)' },
    { value: 'codestral-latest', description: 'Codestral — optimized for coding' },
    { value: 'mistral-small-latest', description: 'Mistral Small — fast and affordable' },
    { value: 'open-mistral-7b', description: 'Mistral 7B — lightweight' },
  ],
  together: [
    { value: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', description: 'Llama 3.3 70B — top open source (recommended)' },
    { value: 'Qwen/Qwen2.5-72B-Instruct-Turbo', description: 'Qwen 2.5 72B — excellent coding' },
    { value: 'deepseek-ai/DeepSeek-R1', description: 'DeepSeek R1 — reasoning model' },
    { value: 'meta-llama/Llama-3.1-8B-Instruct-Turbo', description: 'Llama 3.1 8B — fast and cheap' },
  ],
  moonshotai: [
    { value: 'kimi-k2.5', description: 'Kimi K2.5 — latest flagship (recommended)' },
    { value: 'kimi-k1.5', description: 'Kimi K1.5 — previous generation' },
  ],
  openrouter: [
    { value: 'anthropic/claude-sonnet-4-6', description: 'Claude Sonnet 4.6 — strong coding (recommended)' },
    { value: 'openai/gpt-4.1', description: 'GPT-4.1 — top coding performance' },
    { value: 'google/gemini-2.5-pro-preview', description: 'Gemini 2.5 Pro — powerful reasoning' },
    { value: 'deepseek/deepseek-chat', description: 'DeepSeek V3 — cost-effective' },
    { value: 'meta-llama/llama-3.3-70b-instruct', description: 'Llama 3.3 70B — open source' },
  ],
}

type GithubCredentialSource = 'stored' | 'env' | 'none'

function toDraft(profile: ProviderProfile): ProviderDraft {
  return {
    name: profile.name,
    baseUrl: profile.baseUrl,
    model: profile.model,
    apiKey: profile.apiKey ?? '',
  }
}

function presetToDraft(preset: ProviderPreset): ProviderDraft {
  const defaults = getProviderPresetDefaults(preset)
  return {
    name: defaults.name,
    baseUrl: defaults.baseUrl,
    model: defaults.model,
    apiKey: defaults.apiKey ?? '',
  }
}

function profileSummary(profile: ProviderProfile, isActive: boolean): string {
  const activeSuffix = isActive ? ' (active)' : ''
  const keyInfo = profile.apiKey ? 'key set' : 'no key'
  const providerKind =
    profile.provider === 'anthropic' ? 'anthropic' : 'openai-compatible'
  return `${providerKind} · ${profile.baseUrl} · ${profile.model} · ${keyInfo}${activeSuffix}`
}

function getGithubCredentialSourceFromEnv(
  processEnv: NodeJS.ProcessEnv = process.env,
): GithubCredentialSource {
  if (processEnv.GITHUB_TOKEN?.trim() || processEnv.GH_TOKEN?.trim()) {
    return 'env'
  }
  return 'none'
}

async function resolveGithubCredentialSource(
  processEnv: NodeJS.ProcessEnv = process.env,
): Promise<GithubCredentialSource> {
  const envSource = getGithubCredentialSourceFromEnv(processEnv)
  if (envSource !== 'none') {
    return envSource
  }

  if (await readGithubModelsTokenAsync()) {
    return 'stored'
  }

  return 'none'
}

function isGithubProviderAvailable(
  credentialSource: GithubCredentialSource,
  processEnv: NodeJS.ProcessEnv = process.env,
): boolean {
  if (isEnvTruthy(processEnv.CLAUDE_CODE_USE_GITHUB)) {
    return true
  }
  return credentialSource !== 'none'
}

function getGithubProviderModel(
  processEnv: NodeJS.ProcessEnv = process.env,
): string {
  if (isEnvTruthy(processEnv.CLAUDE_CODE_USE_GITHUB)) {
    return processEnv.OPENAI_MODEL?.trim() || GITHUB_PROVIDER_DEFAULT_MODEL
  }
  return GITHUB_PROVIDER_DEFAULT_MODEL
}

function getGithubProviderSummary(
  isActive: boolean,
  credentialSource: GithubCredentialSource,
  processEnv: NodeJS.ProcessEnv = process.env,
): string {
  const credentialSummary =
    credentialSource === 'stored'
      ? 'token stored'
      : credentialSource === 'env'
        ? 'token via env'
        : 'no token found'
  const activeSuffix = isActive ? ' (active)' : ''
  return `github-models · ${GITHUB_PROVIDER_DEFAULT_BASE_URL} · ${getGithubProviderModel(processEnv)} · ${credentialSummary}${activeSuffix}`
}

export function ProviderManager({ mode, onDone }: Props): React.ReactNode {
  const setAppState = useSetAppState()
  const initialGithubCredentialSource = getGithubCredentialSourceFromEnv()
  const initialIsGithubActive = isEnvTruthy(process.env.CLAUDE_CODE_USE_GITHUB)
  const initialHasGithubCredential = initialGithubCredentialSource !== 'none'

  const [profiles, setProfiles] = React.useState(() => getProviderProfiles())
  const [activeProfileId, setActiveProfileId] = React.useState(
    () => getActiveProviderProfile()?.id,
  )
  const [githubProviderAvailable, setGithubProviderAvailable] = React.useState(
    () => isGithubProviderAvailable(initialGithubCredentialSource),
  )
  const [githubCredentialSource, setGithubCredentialSource] = React.useState<GithubCredentialSource>(
    () => initialGithubCredentialSource,
  )
  const [isGithubActive, setIsGithubActive] = React.useState(() => initialIsGithubActive)
  const [isGithubCredentialSourceResolved, setIsGithubCredentialSourceResolved] =
    React.useState(() => initialHasGithubCredential || initialIsGithubActive)
  const githubRefreshEpochRef = React.useRef(0)
  const [screen, setScreen] = React.useState<Screen>(
    mode === 'first-run' ? 'select-preset' : 'menu',
  )
  const [editingProfileId, setEditingProfileId] = React.useState<string | null>(null)
  const [draftProvider, setDraftProvider] = React.useState<ProviderProfile['provider']>(
    'openai',
  )
  const [draftPreset, setDraftPreset] = React.useState<ProviderPreset | null>(null)
  const [showModelSelectForPreset, setShowModelSelectForPreset] = React.useState(false)
  const [draft, setDraft] = React.useState<ProviderDraft>(() =>
    presetToDraft('ollama'),
  )
  const [formStepIndex, setFormStepIndex] = React.useState(0)
  const [cursorOffset, setCursorOffset] = React.useState(0)
  const [statusMessage, setStatusMessage] = React.useState<string | undefined>()
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>()

  // Ollama setup state
  const [ollamaCheckStatus, setOllamaCheckStatus] = React.useState<'checking' | 'installed' | 'not-installed'>('checking')
  const [ollamaModels, setOllamaModels] = React.useState<OllamaModelDescriptor[]>([])
  const [ollamaLocalStep, setOllamaLocalStep] = React.useState<'loading' | 'select'>('loading')
  const [ollamaInstallStatus, setOllamaInstallStatus] = React.useState<'idle' | 'installing' | 'success' | 'error'>('idle')
  const [ollamaInstallError, setOllamaInstallError] = React.useState<string | undefined>()
  // Ollama Cloud state
  const [ollamaMode, setOllamaMode] = React.useState<'local' | 'cloud'>('local')
  const [ollamaCloudKey, setOllamaCloudKey] = React.useState('')
  const [ollamaCloudStep, setOllamaCloudStep] = React.useState<'key-input' | 'loading' | 'models'>('key-input')
  const [ollamaCloudModels, setOllamaCloudModels] = React.useState<Array<{ value: string; description: string }>>([])
  const [ollamaCloudError, setOllamaCloudError] = React.useState<string | undefined>()

  // OpenRouter setup state
  const [openRouterStep, setOpenRouterStep] = React.useState<'key' | 'model'>('key')
  const [openRouterApiKey, setOpenRouterApiKey] = React.useState('')
  const [openRouterModels, setOpenRouterModels] = React.useState<OpenRouterModel[]>([])
  const [openRouterError, setOpenRouterError] = React.useState<string | undefined>()
  const [openRouterLoading, setOpenRouterLoading] = React.useState(false)

  // Generic provider API setup state (openai, deepseek, groq, mistral, together, moonshotai, gemini, anthropic)
  const [presetApiPreset, setPresetApiPreset] = React.useState<ProviderPreset | null>(null)
  const [presetApiStep, setPresetApiStep] = React.useState<'key' | 'loading' | 'model'>('key')
  const [presetApiKey, setPresetApiKey] = React.useState('')
  const [presetApiModels, setPresetApiModels] = React.useState<DynamicModel[]>([])
  const [presetApiError, setPresetApiError] = React.useState<string | undefined>()

  // gqwen-auth (Qwen proxy) setup state
  const [qwenStep, setQwenStep] = React.useState<'checking' | 'installing' | 'authenticating' | 'starting-proxy' | 'model' | 'error'>('checking')
  const [qwenStatusMsg, setQwenStatusMsg] = React.useState('')
  const [qwenModels, setQwenModels] = React.useState<DynamicModel[]>([])
  const [qwenError, setQwenError] = React.useState<string | undefined>()

  const currentStep = FORM_STEPS[formStepIndex] ?? FORM_STEPS[0]
  const currentStepKey = currentStep.key
  const currentValue = draft[currentStepKey]

  const refreshGithubProviderState = React.useCallback((): void => {
    const envCredentialSource = getGithubCredentialSourceFromEnv()
    const githubActive = isEnvTruthy(process.env.CLAUDE_CODE_USE_GITHUB)
    const canResolveFromEnv = githubActive || envCredentialSource !== 'none'

    if (canResolveFromEnv) {
      githubRefreshEpochRef.current += 1
      setGithubCredentialSource(envCredentialSource)
      setGithubProviderAvailable(isGithubProviderAvailable(envCredentialSource))
      setIsGithubActive(githubActive)
      setIsGithubCredentialSourceResolved(true)
      return
    }

    setIsGithubCredentialSourceResolved(false)
    const refreshEpoch = ++githubRefreshEpochRef.current
    void (async () => {
      const credentialSource = await resolveGithubCredentialSource()
      if (refreshEpoch !== githubRefreshEpochRef.current) {
        return
      }

      setGithubCredentialSource(credentialSource)
      setGithubProviderAvailable(isGithubProviderAvailable(credentialSource))
      setIsGithubActive(isEnvTruthy(process.env.CLAUDE_CODE_USE_GITHUB))
      setIsGithubCredentialSourceResolved(true)
    })()
  }, [])

  React.useEffect(() => {
    refreshGithubProviderState()

    return () => {
      githubRefreshEpochRef.current += 1
    }
  }, [refreshGithubProviderState])

  function refreshProfiles(): void {
    const nextProfiles = getProviderProfiles()
    setProfiles(nextProfiles)
    setActiveProfileId(getActiveProviderProfile()?.id)
    refreshGithubProviderState()
  }

  // Check Ollama binary when the ollama-setup screen becomes active
  React.useEffect(() => {
    if (screen !== 'ollama-setup') return
    // Reset all Ollama state on entry
    setOllamaMode('local')
    setOllamaLocalStep('loading')
    setOllamaModels([])
    setOllamaCloudKey('')
    setOllamaCloudStep('key-input')
    setOllamaCloudModels([])
    setOllamaCloudError(undefined)
    setOllamaInstallStatus('idle')
    setOllamaInstallError(undefined)
    setOllamaCheckStatus('checking')

    void (async () => {
      const installed = await isOllamaInstalled()
      if (!installed) {
        setOllamaCheckStatus('not-installed')
        return
      }
      setOllamaCheckStatus('installed')
      // Fetch local models in parallel
      const models = await listOllamaModelsFromCLI()
      setOllamaModels(models)
      setOllamaLocalStep('select')
    })()
  }, [screen])

  // Full auto-setup for gqwen when qwen-setup screen becomes active
  React.useEffect(() => {
    if (screen !== 'qwen-setup') return
    void (async () => {
      // ── Step 1: Ensure gqwen is installed ──────────────────────────────────
      setQwenStep('checking')
      setQwenStatusMsg('Checking gqwen-auth installation...')
      let installed = await isGqwenInstalled()
      if (!installed) {
        setQwenStep('installing')
        setQwenStatusMsg('Installing gqwen-auth (bun install -g gqwen-auth)...')
        const { success, error } = await installGqwenAuth()
        if (!success) {
          setQwenError(`Install failed: ${error ?? 'unknown error'}. Run manually: bun install -g gqwen-auth`)
          setQwenStep('error')
          return
        }
        installed = await isGqwenInstalled()
        if (!installed) {
          setQwenError('gqwen not found after install. Try: bun install -g gqwen-auth then restart NeoCode.')
          setQwenStep('error')
          return
        }
      }

      // ── Step 2: Check proxy (maybe already running) ────────────────────────
      const alreadyRunning = await isGqwenProxyRunning()
      if (alreadyRunning) {
        const { models } = await listGqwenModels()
        if (models.length > 0) { setQwenModels(models); setQwenStep('model'); return }
      }

      // ── Step 3: Ensure there is at least one authenticated account ─────────
      const hasAccounts = await hasGqwenAccounts()
      if (!hasAccounts) {
        setQwenStep('authenticating')
        setQwenStatusMsg('Opening browser for Qwen OAuth login... Authorize in the browser, then return here.')
        const { success, output } = await runGqwenAdd()
        if (!success) {
          setQwenError(`Authentication failed. ${output || 'Run: gqwen add'}`)
          setQwenStep('error')
          return
        }
      }

      // ── Step 4: Start the proxy ────────────────────────────────────────────
      setQwenStep('starting-proxy')
      setQwenStatusMsg('Starting gqwen proxy at localhost:3099...')
      startGqwenServeBackground()

      // Poll up to 15s for proxy to come up
      let attempts = 0
      await new Promise<void>(res => {
        const poll = setInterval(async () => {
          attempts++
          const up = await isGqwenProxyRunning()
          if (up) { clearInterval(poll); res(); return }
          if (attempts >= 30) { clearInterval(poll); res() }
        }, 500)
      })

      // ── Step 5: Fetch models ───────────────────────────────────────────────
      const { models, error } = await listGqwenModels()
      if (models.length === 0) {
        setQwenError(error ?? 'Proxy started but returned no models. Run: gqwen add')
        setQwenStep('error')
      } else {
        setQwenModels(models)
        setQwenStep('model')
      }
    })()
  }, [screen])

  function saveProfile(payload: ProviderProfileInput): void {
    const saved = addProviderProfile(payload, { makeActive: true })
    if (!saved) {
      setErrorMessage('Could not save provider. Fill all required fields.')
      return
    }
    // Clear any stale model cached in AppState so useMainLoopModel() picks
    // up the new model from process.env (set by applyProviderProfileToProcessEnv).
    setAppState(prev => ({ ...prev, mainLoopModel: null, mainLoopModelForSession: null }))
    const isActiveSavedProfile = getActiveProviderProfile()?.id === saved.id
    const settingsOverrideError = isActiveSavedProfile
      ? clearStartupProviderOverrideFromUserSettings()
      : null
    refreshProfiles()
    const successMessage = `Added provider: ${saved.name} (now active)`
    setStatusMessage(
      settingsOverrideError
        ? `${successMessage}. Warning: could not clear startup override.`
        : successMessage,
    )
    if (mode === 'first-run') {
      onDone({ action: 'saved', activeProfileId: saved.id, message: `Provider configured: ${saved.name}` })
      return
    }
    setScreen('menu')
  }

  function clearStartupProviderOverrideFromUserSettings(): string | null {
    const { error } = updateSettingsForSource('userSettings', {
      env: {
        CLAUDE_CODE_USE_OPENAI: undefined as any,
        CLAUDE_CODE_USE_GEMINI: undefined as any,
        CLAUDE_CODE_USE_GITHUB: undefined as any,
        CLAUDE_CODE_USE_BEDROCK: undefined as any,
        CLAUDE_CODE_USE_VERTEX: undefined as any,
        CLAUDE_CODE_USE_FOUNDRY: undefined as any,
      },
    })
    return error ? error.message : null
  }

  function closeWithCancelled(message: string): void {
    onDone({ action: 'cancelled', message })
  }

  function activateGithubProvider(): string | null {
    const { error } = updateSettingsForSource('userSettings', {
      env: {
        CLAUDE_CODE_USE_GITHUB: '1',
        OPENAI_MODEL: GITHUB_PROVIDER_DEFAULT_MODEL,
        OPENAI_API_KEY: undefined as any,
        OPENAI_ORG: undefined as any,
        OPENAI_PROJECT: undefined as any,
        OPENAI_ORGANIZATION: undefined as any,
        OPENAI_BASE_URL: undefined as any,
        OPENAI_API_BASE: undefined as any,
        CLAUDE_CODE_USE_OPENAI: undefined as any,
        CLAUDE_CODE_USE_GEMINI: undefined as any,
        CLAUDE_CODE_USE_BEDROCK: undefined as any,
        CLAUDE_CODE_USE_VERTEX: undefined as any,
        CLAUDE_CODE_USE_FOUNDRY: undefined as any,
      },
    })
    if (error) {
      return error.message
    }

    process.env.CLAUDE_CODE_USE_GITHUB = '1'
    process.env.OPENAI_MODEL = GITHUB_PROVIDER_DEFAULT_MODEL
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_ORG
    delete process.env.OPENAI_PROJECT
    delete process.env.OPENAI_ORGANIZATION
    delete process.env.OPENAI_BASE_URL
    delete process.env.OPENAI_API_BASE
    delete process.env.CLAUDE_CODE_USE_OPENAI
    delete process.env.CLAUDE_CODE_USE_GEMINI
    delete process.env.CLAUDE_CODE_USE_BEDROCK
    delete process.env.CLAUDE_CODE_USE_VERTEX
    delete process.env.CLAUDE_CODE_USE_FOUNDRY
    delete process.env.CLAUDE_CODE_PROVIDER_PROFILE_ENV_APPLIED
    delete process.env.CLAUDE_CODE_PROVIDER_PROFILE_ENV_APPLIED_ID
    delete process.env[GITHUB_MODELS_HYDRATED_ENV_MARKER]

    hydrateGithubModelsTokenFromSecureStorage()
    return null
  }

  function deleteGithubProvider(): string | null {
    const storedTokenBeforeClear = readGithubModelsToken()?.trim()
    const cleared = clearGithubModelsToken()
    if (!cleared.success) {
      return cleared.warning ?? 'Could not clear GitHub credentials.'
    }

    const { error } = updateSettingsForSource('userSettings', {
      env: {
        CLAUDE_CODE_USE_GITHUB: undefined as any,
        OPENAI_MODEL: undefined as any,
        OPENAI_BASE_URL: undefined as any,
        OPENAI_API_BASE: undefined as any,
      },
    })
    if (error) {
      return error.message
    }

    const hydratedTokenInSession = process.env.GITHUB_TOKEN?.trim()
    if (
      process.env[GITHUB_MODELS_HYDRATED_ENV_MARKER] === '1' &&
      hydratedTokenInSession &&
      (!storedTokenBeforeClear || hydratedTokenInSession === storedTokenBeforeClear)
    ) {
      delete process.env.GITHUB_TOKEN
    }

    delete process.env.CLAUDE_CODE_USE_GITHUB
    delete process.env[GITHUB_MODELS_HYDRATED_ENV_MARKER]
    delete process.env.OPENAI_MODEL
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_ORG
    delete process.env.OPENAI_PROJECT
    delete process.env.OPENAI_ORGANIZATION
    delete process.env.OPENAI_BASE_URL
    delete process.env.OPENAI_API_BASE

    // Restore active provider profile immediately when one exists.
    applyActiveProviderProfileFromConfig()

    return null
  }

  function startCreateFromPreset(preset: ProviderPreset): void {
    // Dedicated flows for Ollama and OpenRouter
    if (preset === 'ollama') {
      setErrorMessage(undefined)
      setOllamaCheckStatus('checking')
      setOllamaModels([])
      setScreen('ollama-setup')
      return
    }
    if (preset === 'openrouter') {
      setErrorMessage(undefined)
      setOpenRouterStep('key')
      setOpenRouterApiKey('')
      setOpenRouterModels([])
      setOpenRouterError(undefined)
      setOpenRouterLoading(false)
      setScreen('openrouter-setup')
      return
    }

    // Providers with live API model listing (key → fetch → select)
    const dynamicPresets: ProviderPreset[] = ['openai', 'deepseek', 'groq', 'mistral', 'together', 'moonshotai', 'gemini', 'anthropic']
    if (dynamicPresets.includes(preset)) {
      setPresetApiPreset(preset)
      setPresetApiStep('key')
      setPresetApiKey('')
      setPresetApiModels([])
      setPresetApiError(undefined)
      setScreen('preset-api-setup')
      return
    }

    // gqwen-auth proxy flow
    if (preset === 'qwen') {
      setQwenStep('checking')
      setQwenModels([])
      setQwenError(undefined)
      setScreen('qwen-setup')
      return
    }

    const defaults = getProviderPresetDefaults(preset)
    const nextDraft = {
      name: defaults.name,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
      apiKey: defaults.apiKey ?? '',
    }
    setEditingProfileId(null)
    setDraftProvider(defaults.provider ?? 'openai')
    setDraftPreset(preset)
    setDraft(nextDraft)
    setFormStepIndex(0)
    setCursorOffset(nextDraft.name.length)
    setErrorMessage(undefined)
    const hasModelOptions = Boolean(PRESET_MODEL_OPTIONS[preset])
    setShowModelSelectForPreset(hasModelOptions)
    setScreen('form')
  }

  function startEditProfile(profileId: string): void {
    const existing = profiles.find(profile => profile.id === profileId)
    if (!existing) {
      return
    }

    const nextDraft = toDraft(existing)
    setEditingProfileId(profileId)
    setDraftProvider(existing.provider ?? 'openai')
    setDraftPreset(null)
    setShowModelSelectForPreset(false)
    setDraft(nextDraft)
    setFormStepIndex(0)
    setCursorOffset(nextDraft.name.length)
    setErrorMessage(undefined)
    setScreen('form')
  }

  function persistDraft(): void {
    const payload: ProviderProfileInput = {
      provider: draftProvider,
      name: draft.name,
      baseUrl: draft.baseUrl,
      model: draft.model,
      apiKey: draft.apiKey,
    }

    const saved = editingProfileId
      ? updateProviderProfile(editingProfileId, payload)
      : addProviderProfile(payload, { makeActive: true })

    if (!saved) {
      setErrorMessage('Could not save provider. Fill all required fields.')
      return
    }

    // Clear stale model from AppState so useMainLoopModel() picks up the new
    // model from process.env immediately (no restart needed).
    setAppState(prev => ({ ...prev, mainLoopModel: null, mainLoopModelForSession: null }))

    const isActiveSavedProfile = getActiveProviderProfile()?.id === saved.id
    const settingsOverrideError = isActiveSavedProfile
      ? clearStartupProviderOverrideFromUserSettings()
      : null

    refreshProfiles()
    const successMessage =
      editingProfileId
        ? `Updated provider: ${saved.name}`
        : `Added provider: ${saved.name} (now active)`
    setStatusMessage(
      settingsOverrideError
        ? `${successMessage}. Warning: could not clear startup provider override (${settingsOverrideError}).`
        : successMessage,
    )

    if (mode === 'first-run') {
      onDone({
        action: 'saved',
        activeProfileId: saved.id,
        message: `Provider configured: ${saved.name}`,
      })
      return
    }

    setEditingProfileId(null)
    setFormStepIndex(0)
    setErrorMessage(undefined)
    setScreen('menu')
  }

  function handleFormSubmit(value: string): void {
    const trimmed = value.trim()

    if (!currentStep.optional && trimmed.length === 0) {
      setErrorMessage(`${currentStep.label} is required.`)
      return
    }

    const nextDraft = {
      ...draft,
      [currentStepKey]: trimmed,
    }

    setDraft(nextDraft)
    setErrorMessage(undefined)

    if (formStepIndex < FORM_STEPS.length - 1) {
      const nextIndex = formStepIndex + 1
      const nextKey = FORM_STEPS[nextIndex]?.key ?? 'name'
      setFormStepIndex(nextIndex)
      setCursorOffset(nextDraft[nextKey].length)
      return
    }

    persistDraft()
  }

  function handleBackFromForm(): void {
    setErrorMessage(undefined)

    // If at the model text-entry step after choosing "Custom...", restore the Select
    if (formStepIndex === 2 && !showModelSelectForPreset && draftPreset && PRESET_MODEL_OPTIONS[draftPreset]) {
      setShowModelSelectForPreset(true)
      setDraft(prev => ({ ...prev, model: '' }))
      setCursorOffset(0)
      return
    }

    if (formStepIndex > 0) {
      const nextIndex = formStepIndex - 1
      const nextKey = FORM_STEPS[nextIndex]?.key ?? 'name'
      setFormStepIndex(nextIndex)
      setCursorOffset(draft[nextKey].length)
      return
    }

    if (mode === 'first-run') {
      setScreen('select-preset')
      return
    }

    setScreen('menu')
  }

  useKeybinding(
    'confirm:no',
    () => {
      if (screen === 'form') {
        handleBackFromForm()
      } else if (
        screen === 'ollama-setup' ||
        screen === 'openrouter-setup' ||
        screen === 'preset-api-setup' ||
        screen === 'qwen-setup'
      ) {
        setScreen('select-preset')
      }
    },
    {
      context: 'Settings',
      isActive:
        screen === 'form' ||
        screen === 'ollama-setup' ||
        screen === 'openrouter-setup' ||
        screen === 'preset-api-setup' ||
        screen === 'qwen-setup',
    },
  )

  function renderPresetSelection(): React.ReactNode {
    const options = [
      {
        value: 'anthropic',
        label: 'Anthropic',
        description: 'Native Claude API (x-api-key auth)',
      },
      {
        value: 'ollama',
        label: 'Ollama',
        description: 'Local or remote Ollama endpoint',
      },
      {
        value: 'openai',
        label: 'OpenAI',
        description: 'OpenAI API with API key',
      },
      {
        value: 'moonshotai',
        label: 'Moonshot AI',
        description: 'Kimi OpenAI-compatible endpoint',
      },
      {
        value: 'deepseek',
        label: 'DeepSeek',
        description: 'DeepSeek OpenAI-compatible endpoint',
      },
      {
        value: 'gemini',
        label: 'Google Gemini',
        description: 'Gemini OpenAI-compatible endpoint',
      },
      {
        value: 'together',
        label: 'Together AI',
        description: 'Together chat/completions endpoint',
      },
      {
        value: 'groq',
        label: 'Groq',
        description: 'Groq OpenAI-compatible endpoint',
      },
      {
        value: 'mistral',
        label: 'Mistral',
        description: 'Mistral OpenAI-compatible endpoint',
      },
      {
        value: 'azure-openai',
        label: 'Azure OpenAI',
        description: 'Azure OpenAI endpoint (model=deployment name)',
      },
      {
        value: 'openrouter',
        label: 'OpenRouter',
        description: 'OpenRouter OpenAI-compatible endpoint',
      },
      {
        value: 'qwen',
        label: 'Qwen (gqwen-auth)',
        description: 'Qwen Plus/Max via local gqwen-auth proxy (free OAuth)',
      },
      {
        value: 'lmstudio',
        label: 'LM Studio',
        description: 'Local LM Studio endpoint',
      },
      {
        value: 'custom',
        label: 'Custom',
        description: 'Any OpenAI-compatible provider',
      },
      ...(mode === 'first-run'
        ? [
          {
            value: 'skip',
            label: 'Skip for now',
            description: 'Continue with current defaults',
          },
        ]
        : []),
    ]

    return (
      <Box flexDirection="column" gap={1}>
        <Text color="remember" bold>
          {mode === 'first-run' ? 'Set up provider' : 'Choose provider preset'}
        </Text>
        <Text dimColor>
          Pick a preset, then confirm base URL, model, and API key.
        </Text>
        <Select
          options={options}
          onChange={(value: string) => {
            if (value === 'skip') {
              closeWithCancelled('Provider setup skipped')
              return
            }
            startCreateFromPreset(value as ProviderPreset)
          }}
          onCancel={() => {
            if (mode === 'first-run') {
              closeWithCancelled('Provider setup skipped')
              return
            }
            setScreen('menu')
          }}
          visibleOptionCount={Math.min(12, options.length)}
        />
      </Box>
    )
  }

  function renderForm(): React.ReactNode {
    // When at the model step and the preset has a known model list, show a ranked Select
    if (currentStepKey === 'model' && showModelSelectForPreset && draftPreset && PRESET_MODEL_OPTIONS[draftPreset]) {
      const presetOptions = PRESET_MODEL_OPTIONS[draftPreset]!
      const selectOptions = [
        ...presetOptions.map(m => ({
          value: m.value,
          label: m.value,
          description: m.description,
        })),
        {
          value: CUSTOM_MODEL_OPTION,
          label: 'Custom model name...',
          description: 'Enter a model name manually',
        },
      ]
      const defaultModel = presetOptions.some(m => m.value === draft.model)
        ? draft.model
        : presetOptions[0]?.value

      return (
        <Box flexDirection="column" gap={1}>
          <Text color="remember" bold>
            {editingProfileId ? 'Edit provider profile' : 'Create provider profile'}
          </Text>
          <Text dimColor>
            Choose a model for {draft.name} (ranked by performance)
          </Text>
          <Select
            options={selectOptions}
            defaultValue={defaultModel}
            defaultFocusValue={defaultModel}
            inlineDescriptions
            visibleOptionCount={Math.min(9, selectOptions.length)}
            onChange={(value: string) => {
              if (value === CUSTOM_MODEL_OPTION) {
                // Switch to manual text entry for the model step
                setShowModelSelectForPreset(false)
                setDraft(prev => ({ ...prev, model: '' }))
                setCursorOffset(0)
                return
              }
              const nextDraft = { ...draft, model: value }
              setDraft(nextDraft)
              // Advance to the next step (API key)
              const nextIndex = formStepIndex + 1
              if (nextIndex < FORM_STEPS.length) {
                const nextKey = FORM_STEPS[nextIndex]?.key ?? 'apiKey'
                setFormStepIndex(nextIndex)
                setCursorOffset((nextDraft[nextKey] ?? '').length)
              } else {
                persistDraft()
              }
            }}
            onCancel={handleBackFromForm}
          />
          <Text dimColor>↑↓ navigate · Enter select · Esc back</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Text color="remember" bold>
          {editingProfileId ? 'Edit provider profile' : 'Create provider profile'}
        </Text>
        <Text dimColor>{currentStep.helpText}</Text>
        <Text dimColor>
          Provider type:{' '}
          {draftProvider === 'anthropic'
            ? 'Anthropic native API'
            : 'OpenAI-compatible API'}
        </Text>
        <Text dimColor>
          Step {formStepIndex + 1} of {FORM_STEPS.length}: {currentStep.label}
        </Text>
        <Box flexDirection="row" gap={1}>
          <Text>{figures.pointer}</Text>
          <TextInput
            value={currentValue}
            onChange={value =>
              setDraft(prev => ({
                ...prev,
                [currentStepKey]: value,
              }))
            }
            onSubmit={handleFormSubmit}
            focus={true}
            showCursor={true}
            placeholder={`${currentStep.placeholder}${figures.ellipsis}`}
            columns={80}
            cursorOffset={cursorOffset}
            onChangeCursorOffset={setCursorOffset}
          />
        </Box>
        {errorMessage && <Text color="error">{errorMessage}</Text>}
        <Text dimColor>
          Press Enter to continue. Press Esc to go back.
        </Text>
      </Box>
    )
  }

  function renderOllamaSetup(): React.ReactNode {
    const backScreen = 'select-preset'

    /** Save profile then respawn the CLI with the new Ollama env. */
    function launchWithOllama(
      payload: Parameters<typeof saveProfile>[0],
      label: string,
      skipOllamaServe = false,
    ): void {
      const saved = addProviderProfile(payload, { makeActive: true })
      if (!saved) { setErrorMessage('Could not save provider.'); return }
      setAppState(prev => ({ ...prev, mainLoopModel: null, mainLoopModelForSession: null }))
      // Show a brief "starting" message then respawn
      setErrorMessage(`Starting ${label}...`)
      setTimeout(() => respawnCLI(skipOllamaServe), 600)
    }

    /** Switch to Ollama Cloud key entry, resetting cloud state. */
    function switchToCloud(): void {
      setOllamaMode('cloud')
      setOllamaCloudStep('key-input')
      setOllamaCloudKey('')
      setOllamaCloudError(undefined)
    }

    // ── Cloud mode ──────────────────────────────────────────────────────────
    if (ollamaMode === 'cloud') {
      if (ollamaCloudStep === 'key-input') {
        return (
          <Box flexDirection="column" gap={1}>
            <Text color="remember" bold>Ollama Cloud — API key</Text>
            <Text dimColor>Enter your Ollama Cloud API key.</Text>
            <Text dimColor>Get one at: https://ollama.ai/settings/api-keys</Text>
            <Box flexDirection="row" gap={1}>
              <Text>{figures.pointer}</Text>
              <TextInput
                value={ollamaCloudKey}
                onChange={setOllamaCloudKey}
                onSubmit={async (value: string) => {
                  const key = value.trim()
                  if (!key) { setOllamaCloudError('API key is required.'); return }
                  setOllamaCloudError(undefined)
                  setOllamaCloudStep('loading')
                  const models = await listOllamaCloudModels(key)
                  setOllamaCloudModels(models)
                  setOllamaCloudStep('models')
                }}
                focus={true}
                showCursor={true}
                placeholder="ollama_..."
                columns={60}
                cursorOffset={ollamaCloudKey.length}
                onChangeCursorOffset={() => { }}
              />
            </Box>
            {ollamaCloudError && <Text color="error">{ollamaCloudError}</Text>}
            <Text dimColor>Enter to continue · Esc to go back</Text>
          </Box>
        )
      }

      if (ollamaCloudStep === 'loading') {
        return (
          <Box flexDirection="column" gap={1}>
            <Text color="remember" bold>Ollama Cloud — fetching models...</Text>
          </Box>
        )
      }

      // Cloud model selection
      const cloudOptions = ollamaCloudModels.map(m => ({
        value: m.value,
        label: m.value,
        description: m.description,
      }))
      cloudOptions.push({ value: '__back__', label: 'Back', description: 'Return to key entry' })
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="remember" bold>Ollama Cloud — select model</Text>
          <Text dimColor>Served via {OLLAMA_CLOUD_BASE_URL}</Text>
          <Select
            options={cloudOptions}
            inlineDescriptions
            visibleOptionCount={Math.min(10, cloudOptions.length)}
            onChange={(value: string) => {
              if (value === '__back__') { setOllamaCloudStep('key-input'); return }
              launchWithOllama({
                provider: 'openai',
                name: `Ollama Cloud · ${value}`,
                baseUrl: `${OLLAMA_CLOUD_BASE_URL}/v1`,
                model: value,
                apiKey: ollamaCloudKey.trim(),
              }, `Ollama Cloud · ${value}`, true)
            }}
            onCancel={() => setOllamaCloudStep('key-input')}
          />
          <Text dimColor>↑↓ navigate · Enter select · Esc back</Text>
        </Box>
      )
    }

    // ── Checking binary ─────────────────────────────────────────────────────
    if (ollamaCheckStatus === 'checking') {
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="remember" bold>Ollama</Text>
          <Text dimColor>Checking Ollama installation...</Text>
        </Box>
      )
    }

    // ── Not installed ───────────────────────────────────────────────────────
    if (ollamaCheckStatus === 'not-installed') {
      if (ollamaInstallStatus === 'installing') {
        return (
          <Box flexDirection="column" gap={1}>
            <Text color="remember" bold>Ollama — installing...</Text>
            <Text dimColor>Running the Ollama install script. This may take a moment.</Text>
          </Box>
        )
      }

      if (ollamaInstallStatus === 'success') {
        return (
          <Box flexDirection="column" gap={1}>
            <Text color="remember" bold>Ollama — installed!</Text>
            <Text dimColor>Pull a model to get started:</Text>
            <Text dimColor>  ollama pull qwen2.5-coder:7b</Text>
            <Text dimColor>Restarting NeoCode...</Text>
          </Box>
        )
      }

      const installOptions: Array<{ value: string; label: string; description: string }> = []
      if (process.platform !== 'win32') {
        installOptions.push({ value: 'install', label: 'Install Ollama automatically', description: 'Runs the official install script (curl | sh)' })
      } else {
        installOptions.push({ value: 'install-win', label: 'Download Ollama for Windows', description: 'Opens instructions — Windows auto-install not supported' })
      }
      installOptions.push({ value: 'cloud', label: 'Use Ollama Cloud instead', description: 'Connect with API key — no local install needed' })
      installOptions.push({ value: 'back', label: 'Back', description: 'Return to provider selection' })

      return (
        <Box flexDirection="column" gap={1}>
          <Text color="remember" bold>Ollama — not installed</Text>
          <Text dimColor>The ollama command was not found on your system.</Text>
          {ollamaInstallStatus === 'error' && (
            <Text color="error">Install failed: {ollamaInstallError}</Text>
          )}
          <Select
            options={installOptions}
            onChange={async (value: string) => {
              if (value === 'back') { setScreen(backScreen); return }
              if (value === 'cloud') { switchToCloud(); return }
              if (value === 'install-win') {
                setOllamaInstallError('Download from: https://ollama.com/download/windows  then restart NeoCode.')
                setOllamaInstallStatus('error')
                return
              }
              // Auto install (Linux/macOS)
              setOllamaInstallStatus('installing')
              const result = await installOllama()
              if (result === 'success') {
                setOllamaInstallStatus('success')
                // Restart after a moment so user can read the message
                setTimeout(() => respawnCLI(), 2500)
              } else {
                const msg = result.startsWith('error:') ? result.slice(6) : result
                setOllamaInstallError(msg)
                setOllamaInstallStatus('error')
              }
            }}
            onCancel={() => setScreen(backScreen)}
            visibleOptionCount={installOptions.length}
          />
          {ollamaInstallStatus === 'error' && ollamaInstallError && (
            <Text dimColor>{ollamaInstallError}</Text>
          )}
        </Box>
      )
    }

    // ── Installed — fetching models ─────────────────────────────────────────
    if (ollamaLocalStep === 'loading') {
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="remember" bold>Ollama — installed</Text>
          <Text dimColor>Fetching local models via ollama list...</Text>
        </Box>
      )
    }

    // ── Installed — model selection ─────────────────────────────────────────
    const ranked = rankOllamaModels(ollamaModels, 'coding')

    if (ranked.length === 0) {
      // No pulled models yet
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="remember" bold>Ollama — no models pulled yet</Text>
          <Text dimColor>Pull a model first, then select it below:</Text>
          {SUGGESTED_OLLAMA_MODELS.map(m => (
            <Text key={m.name} dimColor>  ollama pull {m.name}  — {m.description}</Text>
          ))}
          <Select
            options={[
              { value: '__cloud__', label: 'Use Ollama Cloud instead', description: 'API key · no local models needed' },
              { value: '__retry__', label: 'Retry', description: 'Refresh model list after pulling' },
              { value: '__back__', label: 'Back', description: 'Return to provider selection' },
            ]}
            onChange={async (value: string) => {
              if (value === '__back__') { setScreen(backScreen); return }
              if (value === '__cloud__') { switchToCloud(); return }
              setOllamaLocalStep('loading')
              const models = await listOllamaModelsFromCLI()
              setOllamaModels(models)
              setOllamaLocalStep('select')
            }}
            onCancel={() => setScreen(backScreen)}
            visibleOptionCount={3}
          />
        </Box>
      )
    }

    const modelOptions = ranked.map(m => ({
      value: m.name,
      label: m.name,
      description: m.parameterSize
        ? `${m.family ?? 'local'} · ${m.parameterSize}`
        : (m.family ?? 'local model'),
    }))
    modelOptions.push({ value: '__cloud__', label: 'Use Ollama Cloud instead', description: 'Connect with API key' })
    modelOptions.push({ value: '__back__', label: 'Back', description: 'Return to provider selection' })

    return (
      <Box flexDirection="column" gap={1}>
        <Text color="remember" bold>Ollama — select model</Text>
        <Text dimColor>Local models ranked by coding performance.</Text>
        {errorMessage && <Text color="success">{errorMessage}</Text>}
        <Select
          options={modelOptions}
          inlineDescriptions
          visibleOptionCount={Math.min(10, modelOptions.length)}
          onChange={(value: string) => {
            if (value === '__back__') { setScreen(backScreen); return }
            if (value === '__cloud__') { switchToCloud(); return }
            launchWithOllama({
              provider: 'openai',
              name: `Ollama · ${value}`,
              baseUrl: `${DEFAULT_OLLAMA_BASE_URL}/v1`,
              model: value,
              apiKey: '',
            }, `Ollama · ${value}`)
          }}
          onCancel={() => setScreen(backScreen)}
        />
        <Text dimColor>↑↓ navigate · Enter select · Esc back</Text>
      </Box>
    )
  }

  function renderOpenRouterSetup(): React.ReactNode {
    if (openRouterStep === 'key') {
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="remember" bold>OpenRouter — API key</Text>
          <Text dimColor>Enter your OpenRouter API key to fetch available models.</Text>
          <Text dimColor>Get one at: https://openrouter.ai/keys</Text>
          <Box flexDirection="row" gap={1}>
            <Text>{figures.pointer}</Text>
            <TextInput
              value={openRouterApiKey}
              onChange={setOpenRouterApiKey}
              onSubmit={async (value: string) => {
                const key = value.trim()
                if (!key) { setOpenRouterError('API key is required.'); return }
                setOpenRouterError(undefined)
                setOpenRouterLoading(true)
                const { models, error } = await listOpenRouterModels(key)
                setOpenRouterLoading(false)
                if (error) { setOpenRouterError(error); return }
                if (models.length === 0) { setOpenRouterError('No models found for this key.'); return }
                setOpenRouterModels(models)
                setOpenRouterStep('model')
              }}
              focus={true}
              showCursor={true}
              placeholder="sk-or-..."
              columns={60}
              cursorOffset={openRouterApiKey.length}
              onChangeCursorOffset={() => { }}
            />
          </Box>
          {openRouterLoading && <Text dimColor>Fetching models from OpenRouter...</Text>}
          {openRouterError && <Text color="error">{openRouterError}</Text>}
          <Text dimColor>Press Enter to continue · Esc to go back</Text>
        </Box>
      )
    }

    // Step: model selection
    const freeModels = openRouterModels.filter(m => m.isFree)
    const paidModels = openRouterModels.filter(m => !m.isFree)
    const modelOptions = [
      ...freeModels.map(m => ({
        value: m.id,
        label: `[FREE] ${m.id}`,
        description: m.contextLength ? `${m.name} · ${Math.round(m.contextLength / 1000)}k ctx` : m.name,
      })),
      ...paidModels.map(m => ({
        value: m.id,
        label: m.id,
        description: m.contextLength ? `${m.name} · ${Math.round(m.contextLength / 1000)}k ctx` : m.name,
      })),
    ]

    return (
      <Box flexDirection="column" gap={1}>
        <Text color="remember" bold>OpenRouter — select model</Text>
        <Text dimColor>
          {freeModels.length} free · {paidModels.length} paid models (ranked by coding performance)
        </Text>
        <Select
          options={modelOptions}
          inlineDescriptions
          visibleOptionCount={Math.min(12, modelOptions.length)}
          onChange={(value: string) => {
            saveProfile({
              provider: 'openai',
              name: `OpenRouter · ${value}`,
              baseUrl: 'https://openrouter.ai/api/v1',
              model: value,
              apiKey: openRouterApiKey.trim(),
            })
          }}
          onCancel={() => {
            setOpenRouterStep('key')
          }}
        />
        <Text dimColor>↑↓ navigate · Enter select · Esc back to key entry</Text>
      </Box>
    )
  }

  // ── Generic API-key → fetch → select-model setup ─────────────────────────
  function renderPresetApiSetup(): React.ReactNode {
    if (!presetApiPreset) return null
    const defaults = getProviderPresetDefaults(presetApiPreset)
    const providerLabel = defaults.name

    if (presetApiStep === 'key') {
      const isGemini = presetApiPreset === 'gemini'
      const isAnthropicPreset = presetApiPreset === 'anthropic'
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="remember" bold>{providerLabel} — API key</Text>
          <Text dimColor>Enter your {providerLabel} API key to fetch available models.</Text>
          <Box flexDirection="row" gap={1}>
            <Text>›</Text>
            <TextInput
              value={presetApiKey}
              onChange={setPresetApiKey}
              onSubmit={async (value: string) => {
                const key = value.trim()
                if (!key && !isGemini) { setPresetApiError('API key is required.'); return }
                setPresetApiError(undefined)
                setPresetApiStep('loading')
                const { models, error } = await fetchModelsForPreset(presetApiPreset, key)
                if (error && models.length === 0) {
                  setPresetApiError(error)
                  setPresetApiStep('key')
                  return
                }
                if (models.length === 0) {
                  // Fallback: use static preset list if available
                  const staticList = PRESET_MODEL_OPTIONS[presetApiPreset] ?? []
                  setPresetApiModels(staticList.length > 0 ? staticList : [{ value: defaults.model, description: defaults.model }])
                } else {
                  setPresetApiModels(models)
                }
                setPresetApiStep('model')
              }}
              focus={true}
              showCursor={true}
              placeholder={isAnthropicPreset ? 'sk-ant-...' : isGemini ? 'AIza...' : 'sk-...'}
              columns={60}
              cursorOffset={presetApiKey.length}
              onChangeCursorOffset={() => { }}
            />
          </Box>
          {presetApiError && <Text color="error">{presetApiError}</Text>}
          <Text dimColor>Enter to fetch models · Esc to go back</Text>
        </Box>
      )
    }

    if (presetApiStep === 'loading') {
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="remember" bold>{providerLabel} — fetching models...</Text>
          <Text dimColor>Connecting to {providerLabel} API...</Text>
        </Box>
      )
    }

    // Model selection
    const modelOptions = presetApiModels.map(m => ({
      value: m.value,
      label: m.value,
      description: m.description !== m.value ? m.description : undefined,
    }))
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="remember" bold>{providerLabel} — select model</Text>
        <Text dimColor>{presetApiModels.length} models available (live from API)</Text>
        <Select
          options={modelOptions}
          inlineDescriptions
          visibleOptionCount={Math.min(12, modelOptions.length)}
          onChange={(value: string) => {
            saveProfile({
              provider: presetApiPreset === 'anthropic' ? 'anthropic' : 'openai',
              name: `${providerLabel} · ${value}`,
              baseUrl: defaults.baseUrl,
              model: value,
              apiKey: presetApiKey.trim(),
            })
          }}
          onCancel={() => setPresetApiStep('key')}
        />
        <Text dimColor>↑↓ navigate · Enter select · Esc back to key entry</Text>
      </Box>
    )
  }

  // ── gqwen-auth (Qwen proxy) setup ─────────────────────────────────────────
  function renderQwenSetup(): React.ReactNode {
    const stepIcon = (label: string) => (
      <Box flexDirection="column" gap={1}>
        <Text color="remember" bold>Qwen — {label}</Text>
        <Text dimColor>{qwenStatusMsg}</Text>
        <Text dimColor>This may take a moment...</Text>
      </Box>
    )

    if (qwenStep === 'checking') return stepIcon('checking...')
    if (qwenStep === 'installing') return stepIcon('installing gqwen-auth...')
    if (qwenStep === 'starting-proxy') return stepIcon('starting proxy at localhost:3099...')

    if (qwenStep === 'authenticating') {
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="remember" bold>Qwen — browser authentication</Text>
          <Text dimColor>{qwenStatusMsg}</Text>
          <Text dimColor>A browser window has been opened. Log in with your Qwen account and</Text>
          <Text dimColor>click Authorize. NeoCode will continue automatically when done.</Text>
        </Box>
      )
    }

    if (qwenStep === 'error') {
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="remember" bold>Qwen — setup failed</Text>
          <Text color="error">{qwenError}</Text>
          <Text dimColor>You can retry by going back and selecting Qwen again.</Text>
          <Text dimColor>Esc to go back</Text>
        </Box>
      )
    }

    // ── Model selection ────────────────────────────────────────────────────
    const modelOptions = qwenModels.length > 0
      ? qwenModels.map(m => ({
        value: m.value,
        label: m.value,
        description: m.description !== m.value ? m.description : undefined,
      }))
      : [
        { value: 'qwen3-coder-plus', label: 'qwen3-coder-plus', description: 'Qwen3 Coder Plus — best coding (recommended)' },
        { value: 'qwen-plus', label: 'qwen-plus', description: 'Qwen Plus — balanced' },
        { value: 'qwen-max', label: 'qwen-max', description: 'Qwen Max — most capable' },
        { value: 'qwen-turbo', label: 'qwen-turbo', description: 'Qwen Turbo — fastest' },
      ]

    return (
      <Box flexDirection="column" gap={1}>
        <Text color="remember" bold>Qwen (gqwen-auth) — select model</Text>
        <Text dimColor>Served via gqwen proxy at {GQWEN_PROXY_BASE_URL}/v1</Text>
        <Select
          options={modelOptions}
          defaultValue={GQWEN_DEFAULT_MODEL}
          defaultFocusValue={GQWEN_DEFAULT_MODEL}
          inlineDescriptions
          visibleOptionCount={Math.min(10, modelOptions.length)}
          onChange={(value: string) => {
            saveProfile({
              provider: 'openai',
              name: `Qwen · ${value}`,
              baseUrl: `${GQWEN_PROXY_BASE_URL}/v1`,
              model: value,
              apiKey: '',
            })
          }}
          onCancel={() => setScreen('select-preset')}
        />
        <Text dimColor>↑↓ navigate · Enter select · Esc back</Text>
      </Box>
    )
  }

  function renderMenu(): React.ReactNode {
    const hasProfiles = profiles.length > 0
    const hasSelectableProviders = hasProfiles || githubProviderAvailable

    const options = [
      {
        value: 'add',
        label: 'Add provider',
        description: 'Create a new provider profile',
      },
      {
        value: 'activate',
        label: 'Set active provider',
        description: 'Switch the active provider profile',
        disabled: !hasSelectableProviders,
      },
      {
        value: 'edit',
        label: 'Edit provider',
        description: 'Update URL, model, or key',
        disabled: !hasProfiles,
      },
      {
        value: 'delete',
        label: 'Delete provider',
        description: 'Remove a provider profile',
        disabled: !hasSelectableProviders,
      },
      {
        value: 'done',
        label: 'Done',
        description: 'Return to chat',
      },
    ]

    return (
      <Box flexDirection="column" gap={1}>
        <Text color="remember" bold>
          Provider manager
        </Text>
        <Text dimColor>
          Active profile controls base URL, model, and API key used by this session.
        </Text>
        {statusMessage && <Text>{statusMessage}</Text>}
        <Box flexDirection="column">
          {profiles.length === 0 && !githubProviderAvailable ? (
            isGithubCredentialSourceResolved ? (
              <Text dimColor>No provider profiles configured yet.</Text>
            ) : (
              <Text dimColor>Checking GitHub Models credentials...</Text>
            )
          ) : (
            <>
              {profiles.map(profile => (
                <Text key={profile.id} dimColor>
                  - {profile.name}: {profileSummary(profile, profile.id === activeProfileId)}
                </Text>
              ))}
              {githubProviderAvailable ? (
                <Text dimColor>
                  - {GITHUB_PROVIDER_LABEL}:{' '}
                  {getGithubProviderSummary(
                    isGithubActive,
                    githubCredentialSource,
                  )}
                </Text>
              ) : null}
            </>
          )}
        </Box>
        <Select
          options={options}
          onChange={(value: string) => {
            setErrorMessage(undefined)
            switch (value) {
              case 'add':
                setScreen('select-preset')
                break
              case 'activate':
                if (hasSelectableProviders) {
                  setScreen('select-active')
                }
                break
              case 'edit':
                if (profiles.length > 0) {
                  setScreen('select-edit')
                }
                break
              case 'delete':
                if (hasSelectableProviders) {
                  setScreen('select-delete')
                }
                break
              default:
                closeWithCancelled('Provider manager closed')
                break
            }
          }}
          onCancel={() => closeWithCancelled('Provider manager closed')}
          visibleOptionCount={options.length}
        />
      </Box>
    )
  }

  function renderProfileSelection(
    title: string,
    emptyMessage: string,
    onSelect: (profileId: string) => void,
    options?: { includeGithub?: boolean },
  ): React.ReactNode {
    const includeGithub = options?.includeGithub ?? false
    const selectOptions = profiles.map(profile => ({
      value: profile.id,
      label:
        profile.id === activeProfileId
          ? `${profile.name} (active)`
          : profile.name,
      description: `${profile.provider === 'anthropic' ? 'anthropic' : 'openai-compatible'} · ${profile.baseUrl} · ${profile.model}`,
    }))

    if (includeGithub && githubProviderAvailable) {
      selectOptions.push({
        value: GITHUB_PROVIDER_ID,
        label: isGithubActive
          ? `${GITHUB_PROVIDER_LABEL} (active)`
          : GITHUB_PROVIDER_LABEL,
        description: `github-models · ${GITHUB_PROVIDER_DEFAULT_BASE_URL} · ${getGithubProviderModel()}`,
      })
    }

    if (selectOptions.length === 0) {
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="remember" bold>
            {title}
          </Text>
          <Text dimColor>{emptyMessage}</Text>
          <Select
            options={[
              {
                value: 'back',
                label: 'Back',
                description: 'Return to provider manager',
              },
            ]}
            onChange={() => setScreen('menu')}
            onCancel={() => setScreen('menu')}
            visibleOptionCount={1}
          />
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Text color="remember" bold>
          {title}
        </Text>
        <Select
          options={selectOptions}
          onChange={onSelect}
          onCancel={() => setScreen('menu')}
          visibleOptionCount={Math.min(10, Math.max(2, selectOptions.length))}
        />
      </Box>
    )
  }

  let content: React.ReactNode

  switch (screen) {
    case 'select-preset':
      content = renderPresetSelection()
      break
    case 'form':
      content = renderForm()
      break
    case 'ollama-setup':
      content = renderOllamaSetup()
      break
    case 'openrouter-setup':
      content = renderOpenRouterSetup()
      break
    case 'preset-api-setup':
      content = renderPresetApiSetup()
      break
    case 'qwen-setup':
      content = renderQwenSetup()
      break
    case 'select-active':
      content = renderProfileSelection(
        'Set active provider',
        'No providers available. Add one first.',
        profileId => {
          if (profileId === GITHUB_PROVIDER_ID) {
            const githubError = activateGithubProvider()
            if (githubError) {
              setErrorMessage(`Could not activate GitHub provider: ${githubError}`)
              setScreen('menu')
              return
            }
            refreshProfiles()
            setStatusMessage(`Active provider: ${GITHUB_PROVIDER_LABEL}`)
            setScreen('menu')
            return
          }

          const active = setActiveProviderProfile(profileId)
          if (!active) {
            setErrorMessage('Could not change active provider.')
            setScreen('menu')
            return
          }
          // Clear stale model so the new provider's model takes effect immediately.
          setAppState(prev => ({ ...prev, mainLoopModel: null, mainLoopModelForSession: null }))
          const settingsOverrideError =
            clearStartupProviderOverrideFromUserSettings()
          refreshProfiles()
          setStatusMessage(
            settingsOverrideError
              ? `Active provider: ${active.name}. Warning: could not clear startup provider override (${settingsOverrideError}).`
              : `Active provider: ${active.name}`,
          )
          setScreen('menu')
        },
        { includeGithub: true },
      )
      break
    case 'select-edit':
      content = renderProfileSelection(
        'Edit provider',
        'No providers available. Add one first.',
        profileId => {
          startEditProfile(profileId)
        },
      )
      break
    case 'select-delete':
      content = renderProfileSelection(
        'Delete provider',
        'No providers available. Add one first.',
        profileId => {
          if (profileId === GITHUB_PROVIDER_ID) {
            const githubDeleteError = deleteGithubProvider()
            if (githubDeleteError) {
              setErrorMessage(`Could not delete GitHub provider: ${githubDeleteError}`)
            } else {
              refreshProfiles()
              setStatusMessage('GitHub provider deleted')
            }
            setScreen('menu')
            return
          }

          const result = deleteProviderProfile(profileId)
          if (!result.removed) {
            setErrorMessage('Could not delete provider.')
          } else {
            const settingsOverrideError = result.activeProfileId
              ? clearStartupProviderOverrideFromUserSettings()
              : null
            refreshProfiles()
            setStatusMessage(
              settingsOverrideError
                ? `Provider deleted. Warning: could not clear startup provider override (${settingsOverrideError}).`
                : 'Provider deleted',
            )
          }
          setScreen('menu')
        },
        { includeGithub: true },
      )
      break
    case 'menu':
    default:
      content = renderMenu()
      break
  }

  return <Pane color="permission">{content}</Pane>
}
