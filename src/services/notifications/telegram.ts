/**
 * Telegram Bot API notification sender for NeoCode.
 *
 * Uses the Telegram Bot HTTP API directly (no external SDK needed).
 * Create a bot: https://t.me/BotFather
 *
 * Config:
 *   TELEGRAM_BOT_TOKEN=<token>
 *   TELEGRAM_CHAT_ID=<chat_id>
 *   or set via /channel telegram <token> <chat_id>
 */

import { logForDebugging } from '../../utils/debug.js'
import { logError } from '../../utils/log.js'
import { getGlobalConfig } from '../../utils/config.js'

const TELEGRAM_API = 'https://api.telegram.org'

export type TelegramConfig = {
  botToken: string
  chatId: string
}

function getTelegramConfig(): TelegramConfig | null {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (token && chatId) return { botToken: token, chatId }

  const cfg = getGlobalConfig() as Record<string, unknown>
  const tg = cfg.telegramNotifications as Record<string, string> | undefined
  if (tg?.botToken && tg?.chatId) {
    return { botToken: tg.botToken, chatId: tg.chatId }
  }

  return null
}

/**
 * Sends a Telegram message. Supports Markdown formatting.
 * @returns true on success, false on failure
 */
export async function sendTelegramMessage(
  text: string,
  options?: { parseMode?: 'Markdown' | 'HTML' | 'MarkdownV2'; disableNotification?: boolean },
): Promise<boolean> {
  const config = getTelegramConfig()
  if (!config) {
    logForDebugging('[telegram] Not configured. Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID.')
    return false
  }

  const url = `${TELEGRAM_API}/bot${config.botToken}/sendMessage`
  const body = {
    chat_id: config.chatId,
    text,
    parse_mode: options?.parseMode ?? 'Markdown',
    disable_notification: options?.disableNotification ?? false,
  }

  logForDebugging(`[telegram] Sending message to chat ${config.chatId}`)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })

    const json = (await response.json()) as { ok: boolean; description?: string }
    if (!json.ok) {
      logForDebugging(`[telegram] API error: ${json.description ?? 'unknown'}`)
      return false
    }

    logForDebugging('[telegram] Message sent successfully')
    return true
  } catch (e: unknown) {
    logError(e as Error)
    logForDebugging(`[telegram] Request failed: ${(e as Error).message}`)
    return false
  }
}

/** Validates a bot token by calling getMe. Returns bot info or null. */
export async function validateTelegramToken(
  botToken: string,
): Promise<{ username: string; firstName: string } | null> {
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/getMe`, {
      signal: AbortSignal.timeout(10_000),
    })
    const json = (await response.json()) as {
      ok: boolean
      result?: { username: string; first_name: string }
    }
    if (!json.ok || !json.result) return null
    return { username: json.result.username, firstName: json.result.first_name }
  } catch {
    return null
  }
}

/** Returns true when Telegram is configured and reachable. */
export function isTelegramConfigured(): boolean {
  return getTelegramConfig() !== null
}
