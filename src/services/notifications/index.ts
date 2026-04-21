/**
 * NeoCode Notification Dispatcher
 *
 * Central entry point for sending notifications across configured channels.
 * Channels are non-exclusive — a message can be sent to all configured
 * channels simultaneously.
 *
 * Usage:
 *   import { notify } from '../services/notifications/index.js'
 *   await notify('Task completed ✅', { channels: ['telegram', 'discord'] })
 *
 * BTW integration: the KAIROS daemon calls notify() when BTW messages are
 * ready to be dispatched to external channels.
 */

import { logForDebugging } from '../../utils/debug.js'
import { isTelegramConfigured, sendTelegramMessage } from './telegram.js'
import { isDiscordConfigured, sendDiscordMessage } from './discord.js'
import { isWebhookConfigured, sendWebhookNotification } from './webhook.js'

export type NotificationChannel = 'telegram' | 'discord' | 'webhook' | 'all'

export type NotifyOptions = {
  /** Which channels to send to. Defaults to 'all' (all configured). */
  channels?: NotificationChannel[]
  /** Used as Telegram parse mode. Defaults to Markdown. */
  parseMode?: 'Markdown' | 'HTML'
  /** Optional title for channels that support embeds (Discord). */
  title?: string
}

/**
 * Sends a notification to all configured (or specified) channels.
 * Returns a map of channel → success status.
 */
export async function notify(
  text: string,
  options: NotifyOptions = {},
): Promise<Record<NotificationChannel, boolean>> {
  const { channels = ['all'] } = options
  const sendAll = channels.includes('all')
  const results: Record<NotificationChannel, boolean> = {
    all: false,
    telegram: false,
    discord: false,
    webhook: false,
  }

  const tasks: Promise<void>[] = []

  if ((sendAll || channels.includes('telegram')) && isTelegramConfigured()) {
    tasks.push(
      sendTelegramMessage(text, { parseMode: options.parseMode ?? 'Markdown' }).then(ok => {
        results.telegram = ok
      }),
    )
  }

  if ((sendAll || channels.includes('discord')) && isDiscordConfigured()) {
    tasks.push(
      sendDiscordMessage(text, {
        embeds: options.title
          ? [{ title: options.title, description: text, color: 0x00ff41 }]
          : undefined,
      }).then(ok => {
        results.discord = ok
      }),
    )
  }

  if ((sendAll || channels.includes('webhook')) && isWebhookConfigured()) {
    tasks.push(
      sendWebhookNotification(text, { title: options.title }).then(ok => {
        results.webhook = ok
      }),
    )
  }

  if (tasks.length === 0) {
    logForDebugging('[notify] No channels configured. Skipping.')
    return results
  }

  await Promise.allSettled(tasks)
  results.all = results.telegram || results.discord || results.webhook
  return results
}

/** Returns a list of currently configured channel names. */
export function getConfiguredChannels(): NotificationChannel[] {
  const channels: NotificationChannel[] = []
  if (isTelegramConfigured()) channels.push('telegram')
  if (isDiscordConfigured()) channels.push('discord')
  if (isWebhookConfigured()) channels.push('webhook')
  return channels
}

export { sendTelegramMessage, isTelegramConfigured } from './telegram.js'
export { sendDiscordMessage, isDiscordConfigured } from './discord.js'
export { sendWebhookNotification, isWebhookConfigured } from './webhook.js'
