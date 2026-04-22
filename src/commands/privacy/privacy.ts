/**
 * /privacy command - Manage privacy consents and settings
 *
 * Usage:
 *   /privacy                     — show status
 *   /privacy list                — list all consents
 *   /privacy grant <type>        — grant consent for a type
 *   /privacy revoke <type>       — revoke consent for a type
 *   /privacy consent-status      — show first-run consent status
 *   /privacy revoke-consent      — revoke first-run consent (re-onboarding)
 */

import type { LocalCommandCall } from '../../types/command.js'
import {
  hasConsent,
  saveConsent,
  revokeConsent,
  listConsents,
  type PrivacyConsentType,
} from '../../utils/permissions/privacyGates.js'
import {
  hasFirstRunConsent,
  getFirstRunConsentData,
} from '../../utils/permissions/firstRunConsent.js'

const VALID_CONSENT_TYPES: PrivacyConsentType[] = [
  'filesystem-read',
  'filesystem-write',
  'filesystem-browse',
  'computer-use',
  'system-command',
  'network-access',
]

function renderHelp(): string {
  return `**Privacy Management**

Manage privacy consents and view privacy settings.

Usage:
  /privacy                        Show consent status
  /privacy list                   List all active consents
  /privacy grant <type>           Grant permission for a consent type
  /privacy revoke <type>          Revoke permission for a consent type
  /privacy consent-status         Show first-run consent status
  /privacy revoke-consent         Revoke first-run consent (triggers re-onboarding)

Consent Types:
  filesystem-read                 Read files from your computer
  filesystem-write                Write files to your computer
  filesystem-browse               Browse directory structure
  computer-use                    Screenshot + mouse/keyboard control
  system-command                  Execute system commands
  network-access                  Access network/internet

Examples:
  /privacy grant computer-use     Allow computer use (required for /computer-use on)
  /privacy revoke computer-use    Remove computer use permission
  /privacy list                   See all granted permissions

Learn more: docs/PRIVACY_SYSTEM.md, docs/FIRST_RUN_CONSENT.md`
}

function renderStatus(): string {
  const lines: string[] = ['**Privacy Consent Status**', '']

  // First-run consent
  const hasFirstRun = hasFirstRunConsent()
  const firstRunData = getFirstRunConsentData()

  lines.push('**First-Run Consent:**')
  if (hasFirstRun && firstRunData) {
    lines.push(`  ✅ Granted on ${new Date(firstRunData.timestamp).toLocaleString()}`)
    lines.push(`  Version: ${firstRunData.consentVersion}`)
    lines.push(`  User ID: ${firstRunData.userId}`)
  } else {
    lines.push('  ⬜ Not yet granted (will appear on next launch)')
  }

  lines.push('')
  lines.push('**Granular Consents:**')

  const consents = listConsents()
  if (consents.length === 0) {
    lines.push('  No granular consents granted yet.')
    lines.push('  (First-run consent covers basic operations)')
  } else {
    for (const consent of consents) {
      const scopeLabel = consent.scope === 'permanent' ? '∞' : consent.scope === 'session' ? '⏱' : '1x'
      const pathInfo = consent.path ? ` (${consent.path})` : ''
      lines.push(`  ${scopeLabel} ${consent.type}${pathInfo}`)
    }
  }

  lines.push('')
  lines.push('Run `/privacy help` for management commands.')

  return lines.join('\n')
}

function renderList(): string {
  const consents = listConsents()

  if (consents.length === 0) {
    return '**Active Consents:** None\n\nBasic operations are covered by first-run consent.\nRun `/privacy grant <type>` to add granular permissions.'
  }

  const lines: string[] = ['**Active Privacy Consents:**', '']

  for (const consent of consents) {
    const date = new Date(consent.timestamp).toLocaleDateString()
    const scope = consent.scope === 'permanent' ? 'Permanent' : consent.scope === 'session' ? 'Session' : 'Once'
    const path = consent.path ? `\n    Path: ${consent.path}` : ''

    lines.push(`• **${consent.type}**`)
    lines.push(`    Scope: ${scope}`)
    lines.push(`    Granted: ${date}${path}`)
    lines.push('')
  }

  lines.push('Run `/privacy revoke <type>` to remove a consent.')

  return lines.join('\n')
}

function renderConsentStatus(): string {
  const hasFirstRun = hasFirstRunConsent()
  const firstRunData = getFirstRunConsentData()

  if (!hasFirstRun || !firstRunData) {
    return '**First-Run Consent:** Not yet granted\n\nThe privacy notice will appear on your next NeoCode launch.\n\nLearn more: docs/FIRST_RUN_CONSENT.md'
  }

  const lines: string[] = [
    '**First-Run Consent Status:**',
    '',
    `✅ **Consent Given:** Yes`,
    `📅 **Accepted On:** ${new Date(firstRunData.timestamp).toLocaleString()}`,
    `🔢 **Version:** ${firstRunData.consentVersion}`,
    `🆔 **User ID:** ${firstRunData.userId}`,
    `💻 **Platform:** ${firstRunData.platform}`,
    '',
    '**What you approved:**',
    '  • File system access (read, write, browse)',
    '  • System command execution',
    '  • Network access (optional)',
    '  • Computer use (requires additional per-action approval)',
    '',
    'Review full policy: docs/FIRST_RUN_CONSENT.md',
    'Revoke consent: /privacy revoke-consent',
  ]

  return lines.join('\n')
}

export const call: LocalCommandCall = async (args, _ctx) => {
  const trimmed = (args ?? '').trim()
  const [cmd, type] = trimmed.toLowerCase().split(/\s+/)

  // Help
  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    return { type: 'text', value: renderHelp() }
  }

  // Status (default)
  if (!cmd || cmd === 'status') {
    return { type: 'text', value: renderStatus() }
  }

  // List consents
  if (cmd === 'list') {
    return { type: 'text', value: renderList() }
  }

  // Consent status (first-run)
  if (cmd === 'consent-status') {
    return { type: 'text', value: renderConsentStatus() }
  }

  // Revoke first-run consent
  if (cmd === 'revoke-consent') {
    const { revokeFirstRunConsent } = await import('../../utils/permissions/firstRunConsent.js')

    const warning = [
      '⚠️  **Warning: Reset First-Run Consent**',
      '',
      'This will reset your first-run consent.',
      'You will see the privacy notice again on next launch.',
      '',
      'Note: This does NOT revoke granular consents.',
      'Use `/privacy revoke <type>` for those.',
      '',
      'Are you sure? Type `/privacy revoke-consent confirm` to proceed.',
    ].join('\n')

    if (type !== 'confirm') {
      return { type: 'text', value: warning }
    }

    revokeFirstRunConsent()

    return {
      type: 'text',
      value: [
        '✓ First-run consent revoked',
        '✓ User ID preserved',
        '',
        'Restart NeoCode to see the privacy notice again.',
      ].join('\n'),
    }
  }

  // Grant consent
  if (cmd === 'grant') {
    if (!type) {
      return {
        type: 'text',
        value: `Usage: /privacy grant <type>\n\nValid types: ${VALID_CONSENT_TYPES.join(', ')}\n\nExample: /privacy grant computer-use`,
      }
    }

    if (!VALID_CONSENT_TYPES.includes(type as PrivacyConsentType)) {
      return {
        type: 'text',
        value: `Invalid consent type: ${type}\n\nValid types: ${VALID_CONSENT_TYPES.join(', ')}`,
      }
    }

    // Save as permanent consent
    saveConsent(type as PrivacyConsentType, 'permanent')

    return {
      type: 'text',
      value: `✅ **Consent granted:** ${type}\n\nThis permission is now permanently saved.\nRevoke with: /privacy revoke ${type}`,
    }
  }

  // Revoke consent
  if (cmd === 'revoke') {
    if (!type) {
      return {
        type: 'text',
        value: `Usage: /privacy revoke <type>\n\nValid types: ${VALID_CONSENT_TYPES.join(', ')}\n\nExample: /privacy revoke computer-use`,
      }
    }

    if (!VALID_CONSENT_TYPES.includes(type as PrivacyConsentType)) {
      return {
        type: 'text',
        value: `Invalid consent type: ${type}\n\nValid types: ${VALID_CONSENT_TYPES.join(', ')}`,
      }
    }

    if (!hasConsent(type as PrivacyConsentType)) {
      return {
        type: 'text',
        value: `⚠️  No consent found for: ${type}\n\nRun /privacy list to see active consents.`,
      }
    }

    revokeConsent(type as PrivacyConsentType)

    return {
      type: 'text',
      value: `✅ **Consent revoked:** ${type}\n\nThis permission has been removed.\nGrant again with: /privacy grant ${type}`,
    }
  }

  // Unknown command
  return {
    type: 'text',
    value: `Unknown command: ${cmd}\n\n${renderHelp()}`,
  }
}
