/**
 * /channel command — configure and test NeoCode notification channels.
 *
 * Usage:
 *   /channel status                          — show configured channels
 *   /channel telegram <token> <chat_id>      — configure Telegram bot
 *   /channel discord webhook <url>           — configure Discord webhook
 *   /channel discord bot <token> <channel>   — configure Discord bot
 *   /channel webhook <url> [secret]          — configure generic webhook
 *   /channel test [telegram|discord|webhook] — send a test message
 *   /channel clear [telegram|discord|webhook]— remove configuration
 */

import type { LocalCommandCall } from '../../types/command.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import {
  getConfiguredChannels,
  isTelegramConfigured,
  isDiscordConfigured,
  isWebhookConfigured,
  sendTelegramMessage,
  sendDiscordMessage,
  sendWebhookNotification,
} from '../../services/notifications/index.js'
import { validateTelegramToken } from '../../services/notifications/telegram.js'

export const call: LocalCommandCall = async (args, _context) => {
  const parts = (args ?? '').trim().split(/\s+/).filter(Boolean)
  const subcommand = parts[0]?.toLowerCase()

  // ── status ───────────────────────────────────────────────────────────────
  if (!subcommand || subcommand === 'status') {
    const configured = getConfiguredChannels()
    if (configured.length === 0) {
      return {
        type: 'text',
        value:
          'No notification channels configured.\n\n' +
          'Quick setup:\n' +
          '  /channel telegram <bot_token> <chat_id>\n' +
          '  /channel discord webhook <webhook_url>\n' +
          '  /channel webhook <url> [secret]\n\n' +
          'Or set env vars: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID',
      }
    }
    const lines = ['**Configured channels:**', '']
    lines.push(isTelegramConfigured() ? '  ✅ Telegram' : '  ⬜ Telegram (not set)')
    lines.push(isDiscordConfigured() ? '  ✅ Discord' : '  ⬜ Discord (not set)')
    lines.push(isWebhookConfigured() ? '  ✅ Webhook' : '  ⬜ Webhook (not set)')
    lines.push('')
    lines.push('Run `/channel test` to verify.')
    return { type: 'text', value: lines.join('\n') }
  }

  // ── telegram ─────────────────────────────────────────────────────────────
  if (subcommand === 'telegram') {
    const token = parts[1]
    const chatId = parts[2]

    if (!token || !chatId) {
      return {
        type: 'text',
        value:
          'Usage: /channel telegram <bot_token> <chat_id>\n\n' +
          'Get a token: https://t.me/BotFather\n' +
          'Get your chat_id: send /start to your bot, then check https://api.telegram.org/bot<TOKEN>/getUpdates',
      }
    }

    // Validate token before saving
    const botInfo = await validateTelegramToken(token)
    if (!botInfo) {
      return {
        type: 'text',
        value: 'Invalid bot token — could not reach Telegram API. Check the token and try again.',
      }
    }

    saveGlobalConfig(prev => ({
      ...prev,
      telegramNotifications: { botToken: token, chatId },
    }))

    return {
      type: 'text',
      value:
        `Telegram configured ✅\n` +
        `  Bot: @${botInfo.username} (${botInfo.firstName})\n` +
        `  Chat ID: ${chatId}\n\n` +
        `Run \`/channel test telegram\` to verify.`,
    }
  }

  // ── discord ──────────────────────────────────────────────────────────────
  if (subcommand === 'discord') {
    const mode = parts[1]?.toLowerCase()

    if (mode === 'webhook') {
      const webhookUrl = parts[2]
      if (!webhookUrl?.startsWith('http')) {
        return {
          type: 'text',
          value:
            'Usage: /channel discord webhook <webhook_url>\n\n' +
            'Create a webhook: Server Settings → Integrations → Webhooks',
        }
      }
      saveGlobalConfig(prev => ({
        ...prev,
        discordNotifications: { webhookUrl },
      }))
      return {
        type: 'text',
        value: `Discord webhook configured ✅\nRun \`/channel test discord\` to verify.`,
      }
    }

    if (mode === 'bot') {
      const botToken = parts[2]
      const channelId = parts[3]
      if (!botToken || !channelId) {
        return {
          type: 'text',
          value: 'Usage: /channel discord bot <bot_token> <channel_id>',
        }
      }
      saveGlobalConfig(prev => ({
        ...prev,
        discordNotifications: { botToken, channelId },
      }))
      return {
        type: 'text',
        value: `Discord bot configured ✅\nRun \`/channel test discord\` to verify.`,
      }
    }

    return {
      type: 'text',
      value:
        'Usage:\n' +
        '  /channel discord webhook <webhook_url>\n' +
        '  /channel discord bot <bot_token> <channel_id>',
    }
  }

  // ── webhook ──────────────────────────────────────────────────────────────
  if (subcommand === 'webhook') {
    const url = parts[1]
    const secret = parts[2]

    if (!url?.startsWith('http')) {
      return {
        type: 'text',
        value:
          'Usage: /channel webhook <url> [secret]\n\n' +
          'Works with: Slack incoming webhooks, ntfy.sh, n8n, Make, etc.',
      }
    }

    saveGlobalConfig(prev => ({
      ...prev,
      webhookNotifications: { url, ...(secret ? { secret } : {}) },
    }))

    return {
      type: 'text',
      value: `Webhook configured ✅\nURL: ${url}\nRun \`/channel test webhook\` to verify.`,
    }
  }

  // ── test ─────────────────────────────────────────────────────────────────
  if (subcommand === 'test') {
    const target = parts[1]?.toLowerCase()
    const testMsg = '🤖 *NeoCode* — test notification from `/channel test`'
    const results: string[] = []

    const shouldTest = (name: string) => !target || target === name

    if (shouldTest('telegram') && isTelegramConfigured()) {
      const ok = await sendTelegramMessage(testMsg)
      results.push(`Telegram: ${ok ? '✅ sent' : '❌ failed'}`)
    }
    if (shouldTest('discord') && isDiscordConfigured()) {
      const ok = await sendDiscordMessage(testMsg)
      results.push(`Discord: ${ok ? '✅ sent' : '❌ failed'}`)
    }
    if (shouldTest('webhook') && isWebhookConfigured()) {
      const ok = await sendWebhookNotification(testMsg)
      results.push(`Webhook: ${ok ? '✅ sent' : '❌ failed'}`)
    }

    if (results.length === 0) {
      return {
        type: 'text',
        value: target
          ? `Channel '${target}' is not configured. Run /channel status for help.`
          : 'No channels configured. Run /channel status for setup instructions.',
      }
    }

    return { type: 'text', value: results.join('\n') }
  }

  // ── clear ─────────────────────────────────────────────────────────────────
  if (subcommand === 'clear') {
    const target = parts[1]?.toLowerCase()
    const cfg = getGlobalConfig() as Record<string, unknown>

    if (!target || target === 'telegram') {
      saveGlobalConfig(prev => {
        const { telegramNotifications: _, ...rest } = prev as Record<string, unknown>
        return rest as typeof prev
      })
    }
    if (!target || target === 'discord') {
      saveGlobalConfig(prev => {
        const { discordNotifications: _, ...rest } = prev as Record<string, unknown>
        return rest as typeof prev
      })
    }
    if (!target || target === 'webhook') {
      saveGlobalConfig(prev => {
        const { webhookNotifications: _, ...rest } = prev as Record<string, unknown>
        return rest as typeof prev
      })
    }

    return {
      type: 'text',
      value: target ? `${target} configuration cleared.` : 'All channel configurations cleared.',
    }
  }

  return {
    type: 'text',
    value:
      'Unknown subcommand. Available:\n' +
      '  /channel status\n' +
      '  /channel telegram <token> <chat_id>\n' +
      '  /channel discord webhook <url>\n' +
      '  /channel discord bot <token> <channel_id>\n' +
      '  /channel webhook <url> [secret]\n' +
      '  /channel test [telegram|discord|webhook]\n' +
      '  /channel clear [telegram|discord|webhook]',
  }
}
