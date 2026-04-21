/**
 * NeoStatusBar — permanent one-line status bar at the bottom of the REPL.
 * Matrix-style aesthetic: fully theme-aware + real-time data indicators.
 *
 * Layout:
 *   ● Provider Model  │  ⏰ 12m  │  ⊗ 45k 72%  │  ◎  │  ◈  │  ⊞  │  ✦  │  ⚡3  │  ▓░ 5h:65%  │  neo v0.1.0
 *
 * Live indicators:
 *   ⊗ N tokens (ctx%)  — total session tokens + context window %  (poll 3s)
 *   ◎/⏺/◉            — Voice idle / recording / processing
 *   ◈                 — Sandbox / network shield
 *   ⊞                 — Computer-use MCP active
 *   ✦                 — Prompt enhancer (CoT active = bright gold, else dim)
 *   🧠                — Thinking / extended reasoning enabled
 *   ⚡N               — Background agents running
 *   ▓░ 5h:65%         — Rate limit bar (Anthropic only, shown >5%)
 *   ⚡ fast            — Fast mode active
 */

import { feature } from 'bun:bundle'
import React, { useState } from 'react'
import { Box, Text, useInterval } from '../ink.js'
import { isLocalProviderUrl } from '../services/api/providerConfig.js'
import { getRawUtilization } from '../services/claudeAiLimits.js'
import { useAppState } from '../state/AppState.js'
import type { AppState } from '../state/AppStateStore.js'
import { isBackgroundTask } from '../tasks/types.js'
import { getTheme } from '../utils/theme.js'
import { getEnhanceStrategy } from '../utils/promptEnhancer.js'
import { getLocalOpenAICompatibleProviderLabel } from '../utils/providerDiscovery.js'
import { useTheme } from './design-system/ThemeProvider.js'
import {
  getTotalInputTokens,
  getTotalOutputTokens,
  getTotalCacheReadInputTokens,
} from '../bootstrap/state.js'

// ─── Voice imports (tree-shaken when VOICE_MODE is off) ───────────────────────
import { type VoiceState, useVoiceState } from '../context/voice.js'
import { useVoiceEnabled } from '../hooks/useVoiceEnabled.js'

declare const MACRO: { VERSION: string; DISPLAY_VERSION?: string }

// ─── Provider detection ────────────────────────────────────────────────────────

function detectProviderInfo(): { name: string; model: string; isLocal: boolean; isAnthropic: boolean } {
  const useGemini = process.env.CLAUDE_CODE_USE_GEMINI === '1' || process.env.CLAUDE_CODE_USE_GEMINI === 'true'
  const useGithub = process.env.CLAUDE_CODE_USE_GITHUB === '1' || process.env.CLAUDE_CODE_USE_GITHUB === 'true'
  const useOpenAI = process.env.CLAUDE_CODE_USE_OPENAI === '1' || process.env.CLAUDE_CODE_USE_OPENAI === 'true'

  if (useGemini) {
    return { name: 'Gemini', model: process.env.GEMINI_MODEL || 'gemini-2.0-flash', isLocal: false, isAnthropic: false }
  }
  if (useGithub) {
    return { name: 'GitHub', model: process.env.OPENAI_MODEL || 'copilot', isLocal: false, isAnthropic: false }
  }
  if (useOpenAI) {
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    const model = process.env.OPENAI_MODEL || 'gpt-4o'
    const isLocal = isLocalProviderUrl(baseUrl)
    let name = 'OpenAI'
    if (/deepseek/i.test(baseUrl) || /deepseek/i.test(model)) name = 'DeepSeek'
    else if (/openrouter/i.test(baseUrl)) name = 'OpenRouter'
    else if (/groq/i.test(baseUrl)) name = 'Groq'
    else if (/mistral/i.test(baseUrl)) name = 'Mistral'
    else if (isLocal) name = getLocalOpenAICompatibleProviderLabel(baseUrl)
    return { name, model, isLocal, isAnthropic: false }
  }

  const model = process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'
  return { name: 'Anthropic', model, isLocal: false, isAnthropic: true }
}

// ─── Uptime ───────────────────────────────────────────────────────────────────

const START_TIME = Date.now()

function formatUptime(): string {
  const elapsed = Math.floor((Date.now() - START_TIME) / 1000)
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}

// ─── Token helpers ────────────────────────────────────────────────────────────

function formatTokensShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

// ─── Audio waveform helpers ────────────────────────────────────────────────────

const BAR_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const

const WAVE_FRAMES = [
  [0.15, 0.40, 0.65, 0.40, 0.15],
  [0.20, 0.60, 0.90, 0.60, 0.20],
  [0.35, 0.75, 1.00, 0.75, 0.35],
  [0.50, 0.85, 0.80, 0.85, 0.50],
  [0.30, 0.60, 0.75, 0.55, 0.25],
  [0.20, 0.45, 0.60, 0.40, 0.20],
] as const

function levelToChar(v: number): string {
  const idx = Math.min(Math.floor(v * BAR_CHARS.length), BAR_CHARS.length - 1)
  return BAR_CHARS[Math.max(0, idx)]
}

// ─── Separator ────────────────────────────────────────────────────────────────

function Sep(): React.ReactElement {
  return <Text color="#005500" dimColor> │ </Text>
}

// ─── Voice Status Icon ─────────────────────────────────────────────────────────

function VoiceStatusIcon(): React.ReactElement | null {
  // biome-ignore lint/correctness/useHookAtTopLevel: feature() is a compile-time constant
  const voiceEnabled: boolean = feature('VOICE_MODE') ? useVoiceEnabled() : false
  // biome-ignore lint/correctness/useHookAtTopLevel: feature() is a compile-time constant
  const voiceState = feature('VOICE_MODE')
    ? useVoiceState((s: VoiceState) => s.voiceState)
    : ('idle' as const)
  // biome-ignore lint/correctness/useHookAtTopLevel: feature() is a compile-time constant
  const audioLevels = (feature('VOICE_MODE')
    ? useVoiceState((s: VoiceState) => s.voiceAudioLevels)
    : []) as number[]

  const [frame, setFrame] = useState(0)
  const isAnimating = voiceState === 'recording' || voiceState === 'processing'
  useInterval(
    () => setFrame(f => (f + 1) % WAVE_FRAMES.length),
    isAnimating ? 130 : null,
  )

  if (!voiceEnabled) return null

  if (voiceState === 'recording') {
    const levels: readonly number[] =
      audioLevels.length >= 3 ? audioLevels.slice(0, 5) : WAVE_FRAMES[frame % WAVE_FRAMES.length]
    const bars = levels.map(levelToChar).join('')
    return (
      <>
        <Sep />
        <Text color="#ff3333">⏺ </Text>
        <Text color="#ff6633">{bars}</Text>
      </>
    )
  }

  if (voiceState === 'processing') {
    const dots = ['·  ', '·· ', '···'][frame % 3]
    return (
      <>
        <Sep />
        <Text color="#ff8800">◉ </Text>
        <Text color="#cc6600" dimColor>{dots}</Text>
      </>
    )
  }

  return (
    <>
      <Sep />
      <Text color="#224422" dimColor>◎</Text>
    </>
  )
}

// ─── Sandbox Icon ──────────────────────────────────────────────────────────────

function SandboxIcon(): React.ReactElement | null {
  const sandboxEnabled = useAppState(
    (s: AppState) => Boolean((s.settings as { sandbox?: { enabled?: boolean } })?.sandbox?.enabled),
  )
  if (!sandboxEnabled) return null
  return (
    <>
      <Sep />
      <Text color="#00cc44">◈</Text>
    </>
  )
}

// ─── Computer-Use MCP Icon ────────────────────────────────────────────────────

function ComputerUseIcon(): React.ReactElement | null {
  const cuActive = useAppState(
    (s: AppState) => Boolean(s.computerUseMcpState?.allowedApps?.length),
  )
  if (!cuActive) return null
  return (
    <>
      <Sep />
      <Text color="#00cc66">⊞</Text>
    </>
  )
}

// ─── Prompt Enhancer Icon ─────────────────────────────────────────────────────

function PromptEnhancerIcon(): React.ReactElement | null {
  const enabled = useAppState((s: AppState) => s.promptEnhancementEnabled)
  const model = useAppState((s: AppState) => s.mainLoopModel)
  if (!enabled) return null

  const strategy = getEnhanceStrategy(String(model ?? ''))
  const isCotActive = strategy === 'cot-prefix'

  return (
    <>
      <Sep />
      {isCotActive ? (
        // CoT rewrite active — bright matrix accent
        <Text color="#00ff41">✦</Text>
      ) : (
        // Identity pass-through — dim
        <Text color="#224422" dimColor>✦</Text>
      )}
    </>
  )
}

// ─── Thinking Icon ────────────────────────────────────────────────────────────
// Shows when extended reasoning / thinking mode is enabled.

function ThinkingIcon(): React.ReactElement | null {
  const thinkingEnabled = useAppState((s: AppState) => s.thinkingEnabled)
  if (!thinkingEnabled) return null
  return (
    <>
      <Sep />
      <Text color="#00dd55">⬡</Text>
    </>
  )
}

// ─── Fast Mode Icon ───────────────────────────────────────────────────────────

function FastModeIcon(): React.ReactElement | null {
  const fastMode = useAppState((s: AppState) => (s as AppState & { fastMode?: boolean }).fastMode)
  if (!fastMode) return null
  return (
    <>
      <Sep />
      <Text color="#ff7a00">⚡fast</Text>
    </>
  )
}

// ─── Active Agents Icon ───────────────────────────────────────────────────────

function ActiveAgentsIcon(): React.ReactElement | null {
  const agentCount = useAppState((s: AppState) =>
    Object.values(s.tasks).filter(isBackgroundTask).length,
  )
  if (agentCount === 0) return null
  return (
    <>
      <Sep />
      <Text color="#00ff41">⚡</Text>
      <Text color="#00cc33" dimColor>{String(agentCount)}</Text>
    </>
  )
}

// ─── Token Counter ────────────────────────────────────────────────────────────
// Polls every 3 s to show total session tokens + cache read tokens.

function TokenCounter(): React.ReactElement | null {
  const [tokens, setTokens] = useState(() => ({
    total: getTotalInputTokens() + getTotalOutputTokens(),
    cache: getTotalCacheReadInputTokens(),
  }))

  useInterval(() => {
    const total = getTotalInputTokens() + getTotalOutputTokens()
    const cache = getTotalCacheReadInputTokens()
    setTokens({ total, cache })
  }, 3000)

  if (tokens.total === 0) return null

  const totalStr = formatTokensShort(tokens.total)
  const hasCacheHits = tokens.cache > 0
  const cacheStr = hasCacheHits ? `↻${formatTokensShort(tokens.cache)}` : ''

  return (
    <>
      <Sep />
      <Text color="#008f11" dimColor>⊗ </Text>
      <Text color="#00cc33">{totalStr}</Text>
      {hasCacheHits && (
        <Text color="#006611" dimColor> {cacheStr}</Text>
      )}
    </>
  )
}

// ─── Rate Limit Bar ───────────────────────────────────────────────────────────
// Only rendered when using Anthropic and utilization > 5%.
// Shows the highest active window (5h takes priority over 7d).

const RATE_BAR_WIDTH = 8

function buildRateBar(pct: number, width: number): string {
  const filled = Math.round(pct * width)
  const empty = width - filled
  // Use matrix block density: full ▓ medium ▒ low ░
  const fillChar = pct > 0.85 ? '▓' : pct > 0.5 ? '▒' : '░'
  return fillChar.repeat(filled) + '·'.repeat(empty)
}

function RateLimitBar({ isAnthropic }: { isAnthropic: boolean }): React.ReactElement | null {
  const [util, setUtil] = useState(() => getRawUtilization())

  useInterval(() => {
    setUtil(getRawUtilization())
  }, 5000)

  if (!isAnthropic) return null

  // Pick highest active window
  const fiveH = util.five_hour
  const sevenD = util.seven_day
  const active = fiveH ?? sevenD
  if (!active || active.utilization < 0.05) return null

  const pct = Math.min(1, active.utilization)
  const label = fiveH ? '5h' : '7d'
  const pctStr = `${Math.round(pct * 100)}%`
  const bar = buildRateBar(pct, RATE_BAR_WIDTH)

  // Color shifts warm as limit approaches
  const barColor = pct > 0.85 ? '#ff4444' : pct > 0.6 ? '#ff9900' : '#00cc44'

  return (
    <>
      <Sep />
      <Text color="#006611" dimColor>{label}:</Text>
      <Text color={barColor}>{bar}</Text>
      <Text color={barColor} dimColor>{pctStr}</Text>
    </>
  )
}

// ─── Inner component ──────────────────────────────────────────────────────────

function NeoStatusBarInner(): React.ReactElement {
  const { name, model, isLocal, isAnthropic } = detectProviderInfo()
  const [uptime, setUptime] = useState(formatUptime)

  useInterval(() => setUptime(formatUptime()), 10_000)

  const [themeName] = useTheme()
  const theme = getTheme(themeName)

  const version = `v${(typeof MACRO !== 'undefined' ? MACRO.DISPLAY_VERSION ?? MACRO.VERSION : '') || ''}`
  const dotColor = isLocal ? theme.success : theme.claude

  return (
    <Box
      flexDirection="row"
      width="100%"
      paddingLeft={1}
      paddingRight={1}
    >
      {/* ── Provider dot + name + model ──────────────────────── */}
      <Text color={dotColor}>●</Text>
      <Text color={theme.inactive}> </Text>
      <Text color={theme.inactive} dimColor>{name}</Text>
      <Text color={theme.inactive}> </Text>
      <Text color={theme.claude}>{model}</Text>

      <Sep />

      {/* ── Uptime ───────────────────────────────────────────── */}
      <Text color="#006611" dimColor>⏰ </Text>
      <Text color={theme.inactive} dimColor>{uptime}</Text>

      {/* ── Real-time token counter ───────────────────────────── */}
      <TokenCounter />

      {/* ── Rate limit bar (Anthropic only) ──────────────────── */}
      <RateLimitBar isAnthropic={isAnthropic} />

      {/* ── Live feature icons ────────────────────────────────── */}
      <VoiceStatusIcon />
      <SandboxIcon />
      <ComputerUseIcon />
      <PromptEnhancerIcon />
      <ThinkingIcon />
      <FastModeIcon />
      <ActiveAgentsIcon />

      <Sep />

      {/* ── Version ──────────────────────────────────────────── */}
      <Text color="#005500" dimColor>neo </Text>
      <Text color={theme.claude} dimColor>{version}</Text>
    </Box>
  )
}

// ─── Public component ──────────────────────────────────────────────────────────

export function NeoStatusBar(): React.ReactElement | null {
  if (
    process.env.CI ||
    !process.stdout.isTTY ||
    process.env.NEOCODE_NO_STATUSBAR === '1'
  ) {
    return null
  }
  return <NeoStatusBarInner />
}
