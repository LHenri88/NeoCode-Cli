/**
 * Discord notification sender for NeoCode.
 *
 * Supports two modes:
 *   1. Webhook URL (simplest — no bot needed)
 *   2. Bot token + channel ID
 *
 * Config:
 *   DISCORD_WEBHOOK_URL=<webhook_url>   — webhook mode (recommended)
 *   DISCORD_BOT_TOKEN=<token>           — bot mode
 *   DISCORD_CHANNEL_ID=<channel_id>     — required for bot mode
 */

import { logForDebugging } from '../../utils/debug.js'
import { logError } from '../../utils/log.js'
import { getGlobalConfig } from '../../utils/config.js'

const DISCORD_API = 'https://discord.com/api/v10'

type DiscordConfig =
  | { mode: 'webhook'; webhookUrl: string }
  | { mode: 'bot'; botToken: string; channelId: string }

function getDiscordConfig(): DiscordConfig | null {
  // Env: webhook mode
  if (process.env.DISCORD_WEBHOOK_URL) {
    return { mode: 'webhook', webhookUrl: process.env.DISCORD_WEBHOOK_URL }
  }
  // Env: bot mode
  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CHANNEL_ID) {
    return {
      mode: 'bot',
      botToken: process.env.DISCORD_BOT_TOKEN,
      channelId: process.env.DISCORD_CHANNEL_ID,
    }
  }
  // globalConfig
  const cfg = getGlobalConfig() as Record<string, unknown>
  const dc = cfg.discordNotifications as Record<string, string> | undefined
  if (dc?.webhookUrl) return { mode: 'webhook', webhookUrl: dc.webhookUrl }
  if (dc?.botToken && dc?.channelId) {
    return { mode: 'bot', botToken: dc.botToken, channelId: dc.channelId }
  }
  return null
}

export type DiscordEmbed = {
  title?: string
  description?: string
  color?: number  // decimal color, e.g. 0x00ff41 = 65 (Matrix green)
  footer?: { text: string }
  timestamp?: string
}

/**
 * Sends a Discord message. Supports embeds for rich formatting.
 * @returns true on success, false on failure
 */
export async function sendDiscordMessage(
  content: string,
  options?: { embeds?: DiscordEmbed[]; username?: string },
): Promise<boolean> {
  const config = getDiscordConfig()
  if (!config) {
    logForDebugging('[discord] Not configured. Set DISCORD_WEBHOOK_URL or DISCORD_BOT_TOKEN + DISCORD_CHANNEL_ID.')
    return false
  }

  const body: Record<string, unknown> = {
    content,
    username: options?.username ?? 'NeoCode',
  }
  if (options?.embeds?.length) body.embeds = options.embeds

  let url: string
  let headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (config.mode === 'webhook') {
    url = config.webhookUrl
  } else {
    url = `${DISCORD_API}/channels/${config.channelId}/messages`
    headers['Authorization'] = `Bot ${config.botToken}`
  }

  logForDebugging(`[discord] Sending message via ${config.mode}`)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const err = await response.text()
      logForDebugging(`[discord] HTTP ${String(response.status)}: ${err}`)
      return false
    }

    logForDebugging('[discord] Message sent successfully')
    return true
  } catch (e: unknown) {
    logError(e as Error)
    logForDebugging(`[discord] Request failed: ${(e as Error).message}`)
    return false
  }
}

/** Returns true when Discord is configured. */
export function isDiscordConfigured(): boolean {
  return getDiscordConfig() !== null
}
