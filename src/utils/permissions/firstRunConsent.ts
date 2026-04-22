/**
 * First Run Consent - One-time privacy agreement on initial CLI usage
 *
 * Shows a comprehensive privacy notice covering all tool usage when user
 * first launches NeoCode. Once accepted, never shown again (tracked by user ID).
 */

import { getGlobalConfig, saveGlobalConfig } from '../config.js'
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
 * Get first-run consent message
 */
export function getFirstRunConsentMessage(): string {
  return `
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║                    🔒 NeoCode Privacy Notice                      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

Welcome to NeoCode - Privacy-First Agentic CLI

Before you begin, please review what NeoCode can access:

┌─────────────────────────────────────────────────────────────────┐
│ 📁 FILE SYSTEM ACCESS                                           │
├─────────────────────────────────────────────────────────────────┤
│ • Read files from your computer (for code analysis)            │
│ • Write files to your computer (for code generation)           │
│ • Browse directory structure                                    │
│                                                                 │
│ When: When you ask NeoCode to read, write, or analyze files    │
│ Scope: Only directories you explicitly work in                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 💻 SYSTEM COMMANDS                                              │
├─────────────────────────────────────────────────────────────────┤
│ • Execute bash/PowerShell commands                             │
│ • Run build scripts (npm, pip, etc.)                          │
│ • Git operations                                              │
│                                                                 │
│ When: When you ask NeoCode to run commands                     │
│ Protection: Permission system for destructive operations       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🌐 NETWORK ACCESS (Optional)                                    │
├─────────────────────────────────────────────────────────────────┤
│ • Web search (DuckDuckGo)                                      │
│ • Fetch web pages for analysis                                │
│ • Download AI models (Ollama)                                 │
│                                                                 │
│ When: When you ask for web search or online information        │
│ Privacy: No tracking, no analytics                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🖥️  COMPUTER USE (Disabled by Default)                          │
├─────────────────────────────────────────────────────────────────┤
│ • Screenshot capture                                            │
│ • Mouse/keyboard control                                       │
│                                                                 │
│ When: Only if you explicitly enable with /computer-use on      │
│ Protection: Requires additional approval per action            │
└─────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════╗
║                     🛡️  PRIVACY GUARANTEES                        ║
╚═══════════════════════════════════════════════════════════════════╝

✅ ZERO TELEMETRY - No data sent to external servers
✅ LOCAL-FIRST - All operations stay on your machine
✅ VERIFIABLE - Run 'bun run verify:privacy' to audit code
✅ PERMISSION GATES - Approve destructive operations before execution
✅ OPEN SOURCE - Full transparency of all operations

╔═══════════════════════════════════════════════════════════════════╗
║                       📋 YOUR CONTROL                             ║
╚═══════════════════════════════════════════════════════════════════╝

You can always:
• /permissions - Manage tool permissions
• /sandbox - Enable command sandboxing (Docker)
• /computer-use off - Disable screen control
• ~/.claude/settings.json - Full configuration control

╔═══════════════════════════════════════════════════════════════════╗
║                         ⚖️  CONSENT                               ║
╚═══════════════════════════════════════════════════════════════════╝

By continuing, you acknowledge that NeoCode will:
• Access files in directories where you run it
• Execute commands you approve via permission system
• Use AI providers you configure (OpenAI, Ollama, Gemini, etc.)

All operations require your explicit or implicit approval through:
• Working directory scope (you cd into the project)
• Permission prompts for sensitive operations
• Configuration in settings files

This notice appears once. You can review it anytime at:
docs/PRIVACY_SYSTEM.md

═══════════════════════════════════════════════════════════════════

Do you accept these terms and conditions?

  [Y] Yes, I understand and accept
  [N] No, exit NeoCode
  [R] Read full privacy policy

═══════════════════════════════════════════════════════════════════
`.trim()
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
