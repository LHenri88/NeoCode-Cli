/**
 * Generic webhook notification sender for NeoCode.
 *
 * Sends a POST request with a JSON payload to any URL.
 * Useful for Slack incoming webhooks, ntfy.sh, custom endpoints, etc.
 *
 * Config:
 *   WEBHOOK_URL=<url>
 *   WEBHOOK_SECRET=<secret>  — added as Authorization: Bearer <secret>
 */

import { logForDebugging } from '../../utils/debug.js'
import { logError } from '../../utils/log.js'
import { getGlobalConfig } from '../../utils/config.js'

export type WebhookPayload = {
  text?: string
  message?: string
  content?: string
  title?: string
  [key: string]: unknown
}

type WebhookConfig = {
  url: string
  secret?: string
}

function getWebhookConfig(): WebhookConfig | null {
  if (process.env.WEBHOOK_URL) {
    return { url: process.env.WEBHOOK_URL, secret: process.env.WEBHOOK_SECRET }
  }
  const cfg = getGlobalConfig() as Record<string, unknown>
  const wh = cfg.webhookNotifications as Record<string, string> | undefined
  if (wh?.url) return { url: wh.url, secret: wh.secret }
  return null
}

/**
 * Sends a POST request to the configured webhook URL.
 * The payload is JSON-encoded. Field names are kept generic so most
 * webhook consumers (Slack, ntfy, custom) work without additional mapping.
 */
export async function sendWebhookNotification(
  text: string,
  extra?: Partial<WebhookPayload>,
): Promise<boolean> {
  const config = getWebhookConfig()
  if (!config) {
    logForDebugging('[webhook] Not configured. Set WEBHOOK_URL.')
    return false
  }

  const payload: WebhookPayload = {
    text,
    message: text,
    content: text,
    source: 'neocode',
    timestamp: new Date().toISOString(),
    ...extra,
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.secret) headers['Authorization'] = `Bearer ${config.secret}`

  logForDebugging(`[webhook] POST ${config.url}`)

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const err = await response.text()
      logForDebugging(`[webhook] HTTP ${String(response.status)}: ${err}`)
      return false
    }

    logForDebugging('[webhook] Notification sent successfully')
    return true
  } catch (e: unknown) {
    logError(e as Error)
    logForDebugging(`[webhook] Request failed: ${(e as Error).message}`)
    return false
  }
}

export function isWebhookConfigured(): boolean {
  return getWebhookConfig() !== null
}
