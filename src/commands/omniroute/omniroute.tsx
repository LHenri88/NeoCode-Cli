/**
 * /omniroute command — configure and inspect the OmniRoute API gateway.
 *
 * Sub-commands:
 *   /omniroute status           → show current config and enabled state
 *   /omniroute on               → enable OmniRoute for this session
 *   /omniroute off              → disable OmniRoute for this session
 *   /omniroute ping             → health-check the gateway endpoint
 *   /omniroute set url <url>    → set OMNIROUTE_BASE_URL for this session
 *   /omniroute set model <m>    → set OMNIROUTE_MODEL for this session
 *   /omniroute set key <k>      → set OMNIROUTE_API_KEY for this session
 *   /omniroute set timeout <ms> → set OMNIROUTE_HEALTH_TIMEOUT_MS
 *   /omniroute reset            → clear all session overrides
 */

import React from 'react'
import { COMMON_HELP_ARGS } from '../../constants/xml.js'
import {
  isOmniRouteEnabled,
  getOmniRouteBaseUrl,
  getOmniRouteModel,
  getOmniRouteApiKey,
  isOmniRouteAvailable,
  resetOmniRouteAvailabilityCache,
  OMNIROUTE_DEFAULT_BASE_URL,
  OMNIROUTE_DEFAULT_MODEL,
} from '../../services/omniRoute/index.js'
import type {
  LocalJSXCommandCall,
  LocalJSXCommandOnDone,
} from '../../types/command.js'

// ─── Help ─────────────────────────────────────────────────────────────────────

function renderHelp(): string {
  return `Usage: /omniroute [subcommand]

Configure and inspect the OmniRoute API gateway fallback.

OmniRoute is an OpenAI-compatible gateway that routes requests across
100+ LLM providers with automatic fallback chains. When a provider
exhausts its quota or rate limit, NeoCode transparently re-routes
through the gateway without interrupting the conversation.

Sub-commands:
  /omniroute status              Show current configuration and health
  /omniroute on                  Enable OmniRoute for this session
  /omniroute off                 Disable OmniRoute for this session
  /omniroute ping                Test connectivity to the gateway
  /omniroute set url <url>       Set the gateway base URL
  /omniroute set model <model>   Set the combo/model name to use
  /omniroute set key <apikey>    Set the gateway API key
  /omniroute set timeout <ms>    Set the health-check timeout (ms)
  /omniroute reset               Clear all session env overrides

Persistent configuration (survives session):
  Set env vars in your shell profile or .env file:
    OMNIROUTE_ENABLED=1
    OMNIROUTE_BASE_URL=http://localhost:20128/v1
    OMNIROUTE_MODEL=claude-sonnet-4-6
    OMNIROUTE_API_KEY=your-key
    OMNIROUTE_HEALTH_TIMEOUT_MS=3000`
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function renderStatus(): string {
  const enabled = isOmniRouteEnabled()
  const url = getOmniRouteBaseUrl()
  const model = getOmniRouteModel()
  const apiKey = getOmniRouteApiKey()
  const maskedKey =
    apiKey === 'omniroute' ? '(default)' : `${apiKey.slice(0, 4)}${'*'.repeat(Math.max(0, apiKey.length - 4))}`
  const timeout = process.env.OMNIROUTE_HEALTH_TIMEOUT_MS ?? '3000'

  const lines: string[] = [
    `OmniRoute status`,
    ``,
    `Enabled:   ${enabled ? 'YES' : 'NO'}`,
    `URL:       ${url}`,
    `Model:     ${model}`,
    `API Key:   ${maskedKey}`,
    `Timeout:   ${timeout}ms`,
  ]

  if (!enabled) {
    lines.push(``, `Run /omniroute on  to enable for this session.`)
    lines.push(`Or set OMNIROUTE_ENABLED=1 in your environment.`)
  }

  return lines.join('\n')
}

function renderPingResult(available: boolean, url: string): string {
  if (available) {
    return `OmniRoute gateway is reachable.\n  URL: ${url}`
  }
  return [
    `OmniRoute gateway is NOT reachable.`,
    `  URL: ${url}`,
    ``,
    `Check that OmniRoute is running and the URL is correct.`,
    `  /omniroute set url <your-gateway-url>`,
  ].join('\n')
}

// ─── Session env helpers ───────────────────────────────────────────────────────

function setEnv(key: string, value: string): void {
  process.env[key] = value
}

function clearOmniRouteEnv(): void {
  delete process.env.OMNIROUTE_ENABLED
  delete process.env.OMNIROUTE_BASE_URL
  delete process.env.OMNIROUTE_MODEL
  delete process.env.OMNIROUTE_API_KEY
  delete process.env.OMNIROUTE_HEALTH_TIMEOUT_MS
  resetOmniRouteAvailabilityCache()
}

// ─── Command handler ──────────────────────────────────────────────────────────

async function runOmniRouteCommand(
  onDone: LocalJSXCommandOnDone,
  args: string,
): Promise<void> {
  const raw = args.trim()
  const lower = raw.toLowerCase()
  const parts = raw.split(/\s+/)
  const sub = parts[0]?.toLowerCase() ?? ''

  if (!sub || COMMON_HELP_ARGS.includes(sub)) {
    onDone(renderHelp(), { display: 'system' })
    return
  }

  if (sub === 'status') {
    onDone(renderStatus(), { display: 'system' })
    return
  }

  if (sub === 'on' || sub === 'enable') {
    setEnv('OMNIROUTE_ENABLED', '1')
    resetOmniRouteAvailabilityCache()
    onDone(
      `OmniRoute enabled for this session.\n\nRun /omniroute ping to test the gateway connection.\nRun /omniroute status to see full configuration.`,
      { display: 'system' },
    )
    return
  }

  if (sub === 'off' || sub === 'disable') {
    setEnv('OMNIROUTE_ENABLED', '0')
    resetOmniRouteAvailabilityCache()
    onDone(`OmniRoute disabled for this session.`, { display: 'system' })
    return
  }

  if (sub === 'ping') {
    const url = getOmniRouteBaseUrl()
    onDone(`Pinging OmniRoute gateway at ${url} ...`, { display: 'system' })
    resetOmniRouteAvailabilityCache()
    // Temporarily enable to allow the health check even if disabled
    const wasEnabled = process.env.OMNIROUTE_ENABLED
    process.env.OMNIROUTE_ENABLED = '1'
    const available = await isOmniRouteAvailable()
    if (wasEnabled !== undefined) {
      process.env.OMNIROUTE_ENABLED = wasEnabled
    } else {
      delete process.env.OMNIROUTE_ENABLED
    }
    resetOmniRouteAvailabilityCache()
    onDone(renderPingResult(available, url), { display: 'system' })
    return
  }

  if (sub === 'set') {
    const key = parts[1]?.toLowerCase()
    const value = parts.slice(2).join(' ')

    if (!key || !value) {
      onDone(
        `Usage: /omniroute set <url|model|key|timeout> <value>\n\nExample:\n  /omniroute set url http://localhost:20128/v1\n  /omniroute set model claude-sonnet-4-6`,
        { display: 'system' },
      )
      return
    }

    if (key === 'url') {
      setEnv('OMNIROUTE_BASE_URL', value)
      resetOmniRouteAvailabilityCache()
      onDone(`OMNIROUTE_BASE_URL set to: ${value}`, { display: 'system' })
      return
    }

    if (key === 'model') {
      setEnv('OMNIROUTE_MODEL', value)
      onDone(`OMNIROUTE_MODEL set to: ${value}`, { display: 'system' })
      return
    }

    if (key === 'key' || key === 'apikey' || key === 'api-key') {
      setEnv('OMNIROUTE_API_KEY', value)
      resetOmniRouteAvailabilityCache()
      onDone(`OMNIROUTE_API_KEY updated.`, { display: 'system' })
      return
    }

    if (key === 'timeout') {
      const ms = parseInt(value, 10)
      if (isNaN(ms) || ms <= 0) {
        onDone(`Invalid timeout value: "${value}". Must be a positive integer (ms).`, {
          display: 'system',
        })
        return
      }
      setEnv('OMNIROUTE_HEALTH_TIMEOUT_MS', String(ms))
      onDone(`OMNIROUTE_HEALTH_TIMEOUT_MS set to: ${ms}ms`, { display: 'system' })
      return
    }

    onDone(
      `Unknown key: "${key}". Valid keys: url, model, key, timeout`,
      { display: 'system' },
    )
    return
  }

  if (sub === 'reset') {
    clearOmniRouteEnv()
    onDone(
      [
        `OmniRoute session overrides cleared.`,
        ``,
        `Defaults restored:`,
        `  URL:   ${OMNIROUTE_DEFAULT_BASE_URL}`,
        `  Model: ${OMNIROUTE_DEFAULT_MODEL}`,
        `  Enabled: NO (set OMNIROUTE_ENABLED=1 in your shell to persist)`,
      ].join('\n'),
      { display: 'system' },
    )
    return
  }

  onDone(
    `Unknown sub-command: "${raw}"\n\n${renderHelp()}`,
    { display: 'system' },
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const call: LocalJSXCommandCall = async (
  onDone,
  _context,
  args,
): Promise<React.ReactNode> => {
  await runOmniRouteCommand(onDone, args ?? '')
  return null
}
