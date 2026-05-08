/**
 * First Run Consent - One-time approval on initial CLI usage
 *
 * Shows a concise first-run notice explaining local workspace access when the
 * user first launches NeoCode. Once accepted, never shown again (tracked by user ID).
 */

import {
  getGlobalConfig,
  getPreferredLanguage,
  saveGlobalConfig,
  type PreferredLanguage,
} from '../config.js'
import { randomBytes } from 'crypto'
import { platform, userInfo } from 'os'

export interface FirstRunConsentData {
  userId: string
  consentGiven: boolean
  consentVersion: string
  timestamp: number
  platform: string
  username: string
}

const CURRENT_CONSENT_VERSION = '1.0'

/**
 * Generate a unique user ID based on machine + user info
 * This stays the same across sessions but is unique per user/machine
 */
function generateUserId(): string {
  try {
    const username = userInfo().username
    const hostname = userInfo().username // os.hostname() may vary
    const platformId = platform()

    // Create deterministic ID from user info
    const baseId = `${username}-${hostname}-${platformId}`

    // Add random component for additional uniqueness
    const random = randomBytes(8).toString('hex')

    return `${baseId}-${random}`
  } catch {
    // Fallback to random ID if user info unavailable
    return randomBytes(16).toString('hex')
  }
}

/**
 * Check if user has given first-run consent
 */
export function hasFirstRunConsent(): boolean {
  const config = getGlobalConfig() as any
  const consent = config.firstRunConsent as FirstRunConsentData | undefined

  if (!consent) return false
  if (!consent.consentGiven) return false

  // Check if consent version matches (re-prompt if version changes)
  if (consent.consentVersion !== CURRENT_CONSENT_VERSION) return false

  return true
}

/**
 * Get current user ID (creates one if doesn't exist)
 */
export function getUserId(): string {
  const config = getGlobalConfig() as any

  if (config.userId) {
    return config.userId
  }

  const userId = generateUserId()
  saveGlobalConfig(prev => ({
    ...(prev as any),
    userId,
  }))

  return userId
}

/**
 * Save first-run consent
 */
export function saveFirstRunConsent(consentGiven: boolean): void {
  const userId = getUserId()

  const consentData: FirstRunConsentData = {
    userId,
    consentGiven,
    consentVersion: CURRENT_CONSENT_VERSION,
    timestamp: Date.now(),
    platform: platform(),
    username: userInfo().username,
  }

  saveGlobalConfig(prev => ({
    ...(prev as any),
    firstRunConsent: consentData,
  }))
}

/**
 * Get first-run consent message in the current interface language
 */
export function getFirstRunConsentMessage(): string {
  const lang = getPreferredLanguage()

  const messages: Record<PreferredLanguage, string> = {
    en: `
╔═══════════════════════════════════════════════════════════════════╗
║                    Local Workspace Access                        ║
╚═══════════════════════════════════════════════════════════════════╝

On first use, NeoCode needs your approval to let agents/LLMs work in
your local folders through the CLI.

With your approval, NeoCode can:
• view files and folders in the workspace you open here
• create and edit files when you ask
• run commands, with approval prompts for sensitive actions

Your control:
• access is limited to the directories you use in NeoCode
• you can review or change permissions later
• press [R] to read the full privacy policy

Allow local workspace access for NeoCode?

  [Y] Allow
  [N] Exit
  [R] Read full privacy policy
`,
    pt: `
╔═══════════════════════════════════════════════════════════════════╗
║                 Acesso ao Workspace Local                        ║
╚═══════════════════════════════════════════════════════════════════╝

No primeiro uso, o NeoCode precisa da sua autorização para que os
agents/LLMs trabalhem nas suas pastas locais pelo CLI.

Com sua autorização, o NeoCode pode:
• ver arquivos e pastas do workspace aberto aqui
• criar e editar arquivos quando você pedir
• executar comandos, com aprovação para ações sensíveis

Seu controle:
• o acesso fica limitado aos diretórios usados no NeoCode
• você pode revisar ou mudar as permissões depois
• pressione [R] para ler a política completa

Autorizar o acesso ao workspace local pelo NeoCode?

  [Y] Autorizar
  [N] Sair
  [R] Ler política completa
`,
    es: `
╔═══════════════════════════════════════════════════════════════════╗
║               Acceso al Workspace Local                          ║
╚═══════════════════════════════════════════════════════════════════╝

En el primer uso, NeoCode necesita tu autorización para que los
agents/LLMs trabajen en tus carpetas locales desde la CLI.

Con tu autorización, NeoCode puede:
• ver archivos y carpetas del workspace abierto aquí
• crear y editar archivos cuando lo pidas
• ejecutar comandos, con aprobación para acciones sensibles

Tu control:
• el acceso se limita a los directorios que uses en NeoCode
• puedes revisar o cambiar los permisos después
• pulsa [R] para leer la política completa

¿Autorizar el acceso al workspace local para NeoCode?

  [Y] Autorizar
  [N] Salir
  [R] Leer política completa
`,
  }

  return (messages[lang] ?? messages.en).trim()
}

/**
 * Get privacy policy (full version)
 */
export function getFullPrivacyPolicy(): string {
  return `
NeoCode Privacy Policy - Full Version
Version 1.0 - Last Updated: ${new Date().toISOString().split('T')[0]}

═══════════════════════════════════════════════════════════════════
1. DATA COLLECTION
═══════════════════════════════════════════════════════════════════

NeoCode does NOT collect, transmit, or store any user data on external
servers. All data remains on your local machine.

What NeoCode stores locally:
• Configuration files in ~/.claude/
• Session history (if enabled)
• Memory files for context (project-memory.md, guidance.md)
• Tool execution logs (audit.log if enabled)

═══════════════════════════════════════════════════════════════════
2. AI PROVIDER DATA SHARING
═══════════════════════════════════════════════════════════════════

When you use NeoCode with AI providers (OpenAI, Gemini, etc.), the
prompts and code context ARE sent to those providers' APIs.

What is sent to AI providers:
• Your prompts and questions
• Code context from files you're working with
• Tool execution results

What is NOT sent:
• Your file system structure (only requested files)
• Environment variables or secrets (filtered)
• Personal information (unless in code you share)

Local-only option:
• Use Ollama for 100% local AI (no data leaves your machine)

═══════════════════════════════════════════════════════════════════
3. FILE SYSTEM ACCESS
═══════════════════════════════════════════════════════════════════

NeoCode accesses your file system only for:
• Reading files for code analysis (when you request it)
• Writing generated code (when you approve it)
• Executing commands in your working directory

Protected directories:
• System directories require explicit approval
• Sensitive paths (~/.ssh, ~/.aws, etc.) flagged as high-risk
• All writes go through permission system

═══════════════════════════════════════════════════════════════════
4. NETWORK ACCESS
═══════════════════════════════════════════════════════════════════

NeoCode makes network requests for:
• AI API calls (OpenAI, Gemini, etc.)
• Web search (DuckDuckGo - when you request)
• Package installations (npm, pip - when you approve)
• Model downloads (Ollama - when you initiate)

NeoCode does NOT:
• Send telemetry or analytics
• Track your usage
• Call home for updates (manual updates only)
• Share data with third parties

═══════════════════════════════════════════════════════════════════
5. SECURITY
═══════════════════════════════════════════════════════════════════

Security measures:
• Permission gates for dangerous operations
• Sandbox mode for isolated command execution
• Credential filtering (API keys never logged)
• Audit logging (optional, local only)
• Open source (verify the code yourself)

Verify privacy compliance:
  bun run verify:privacy

═══════════════════════════════════════════════════════════════════
6. YOUR RIGHTS
═══════════════════════════════════════════════════════════════════

You have the right to:
• Inspect all code (open source)
• Delete all local data (rm -rf ~/.claude)
• Revoke permissions (at any time)
• Use offline (with Ollama)
• Fork and modify (per license)

═══════════════════════════════════════════════════════════════════
7. UPDATES TO POLICY
═══════════════════════════════════════════════════════════════════

If this policy changes (version number updates), you will be
re-prompted for consent on next launch.

═══════════════════════════════════════════════════════════════════
8. CONTACT
═══════════════════════════════════════════════════════════════════

Questions about privacy?
• GitHub Issues: https://github.com/Gitlawb/NeoCode/issues
• Security: See SECURITY.md
• Documentation: docs/PRIVACY_SYSTEM.md

═══════════════════════════════════════════════════════════════════

Press any key to return to consent screen...
`.trim()
}

/**
 * Get first-run consent data (if exists)
 */
export function getFirstRunConsentData(): FirstRunConsentData | null {
  const config = getGlobalConfig() as any
  return config.firstRunConsent || null
}

/**
 * Revoke first-run consent (triggers re-onboarding on next launch)
 * User ID is preserved
 */
export function revokeFirstRunConsent(): void {
  saveGlobalConfig(prev => {
    const config = prev as any
    const { firstRunConsent, ...rest } = config
    return rest
  })
}

/**
 * Reset first-run consent (for testing or re-onboarding)
 * @deprecated Use revokeFirstRunConsent() instead
 */
export function resetFirstRunConsent(): void {
  revokeFirstRunConsent()
}
