/**
 * Privacy Gates - User consent system for directory and system access
 *
 * Ensures users explicitly approve access to their local filesystem,
 * system resources, and sensitive operations.
 */

import { getGlobalConfig, saveGlobalConfig } from '../config.js'
import { homedir } from 'os'
import { resolve, relative } from 'path'

export type PrivacyConsentType =
  | 'filesystem-read'     // Read files from directory
  | 'filesystem-write'    // Write files to directory
  | 'filesystem-browse'   // Browse directory structure
  | 'computer-use'        // Screenshot + mouse/keyboard control
  | 'system-command'      // Execute system commands
  | 'network-access'      // Access network/internet

export type ConsentScope =
  | 'once'                // One-time approval
  | 'session'             // Valid for current session
  | 'permanent'           // Saved to config

export interface PrivacyConsent {
  type: PrivacyConsentType
  scope: ConsentScope
  path?: string           // For filesystem operations
  timestamp: number
  expiresAt?: number      // For session-scoped consents
}

export interface PrivacyGateOptions {
  type: PrivacyConsentType
  path?: string
  operation: string       // Human-readable description
  allowPermanent?: boolean // Allow "Always allow" option
}

export interface PrivacyGateResult {
  approved: boolean
  scope?: ConsentScope
  rememberChoice?: boolean
}

// Session-scoped consents (cleared on exit)
const sessionConsents = new Set<string>()

// Helper to generate consent key
function consentKey(type: PrivacyConsentType, path?: string): string {
  return path ? `${type}:${resolve(path)}` : type
}

// Check if path is sensitive
function isSensitivePath(path: string): boolean {
  const resolved = resolve(path)
  const home = homedir()

  const sensitivePaths = [
    resolve(home, '.ssh'),
    resolve(home, '.aws'),
    resolve(home, '.config'),
    resolve(home, 'Documents'),
    resolve(home, 'Desktop'),
    resolve(home, 'Downloads'),
    '/etc',
    '/System',
    'C:\\Windows',
    'C:\\Program Files',
  ]

  return sensitivePaths.some(sensitive =>
    resolved.startsWith(sensitive)
  )
}

// Get risk level for operation
export function getPrivacyRiskLevel(options: PrivacyGateOptions): 'low' | 'medium' | 'high' {
  const { type, path } = options

  // High risk operations
  if (type === 'computer-use') return 'high'
  if (type === 'system-command') return 'high'

  // Path-based risk assessment
  if (path && isSensitivePath(path)) return 'high'

  // Medium risk
  if (type === 'filesystem-write') return 'medium'
  if (type === 'network-access') return 'medium'

  // Low risk
  return 'low'
}

// Check if consent has been granted
export function hasConsent(type: PrivacyConsentType, path?: string): boolean {
  const key = consentKey(type, path)

  // Check session consents
  if (sessionConsents.has(key)) return true

  // Check permanent consents in config
  const config = getGlobalConfig() as any
  const consents = config.privacyConsents || []

  return consents.some((consent: PrivacyConsent) => {
    if (consent.type !== type) return false
    if (path && consent.path && consent.path !== resolve(path)) return false
    if (consent.expiresAt && Date.now() > consent.expiresAt) return false
    return true
  })
}

// Save consent
export function saveConsent(
  type: PrivacyConsentType,
  scope: ConsentScope,
  path?: string
): void {
  const key = consentKey(type, path)

  if (scope === 'session') {
    sessionConsents.add(key)
    return
  }

  if (scope === 'permanent') {
    saveGlobalConfig(prev => {
      const config = prev as any
      const consents = config.privacyConsents || []

      const newConsent: PrivacyConsent = {
        type,
        scope,
        path: path ? resolve(path) : undefined,
        timestamp: Date.now(),
      }

      return {
        ...config,
        privacyConsents: [...consents, newConsent],
      }
    })
  }
}

// Revoke consent
export function revokeConsent(type: PrivacyConsentType, path?: string): void {
  const key = consentKey(type, path)
  sessionConsents.delete(key)

  saveGlobalConfig(prev => {
    const config = prev as any
    const consents = (config.privacyConsents || []).filter(
      (consent: PrivacyConsent) => {
        if (consent.type !== type) return true
        if (path && consent.path !== resolve(path)) return true
        return false
      }
    )

    return {
      ...config,
      privacyConsents: consents,
    }
  })
}

// List all active consents
export function listConsents(): PrivacyConsent[] {
  const config = getGlobalConfig() as any
  return config.privacyConsents || []
}

// Clear all session consents
export function clearSessionConsents(): void {
  sessionConsents.clear()
}

// Format path for display (relative to home if possible)
export function formatPathForDisplay(path: string): string {
  const home = homedir()
  const resolved = resolve(path)

  if (resolved.startsWith(home)) {
    return `~${resolved.slice(home.length)}`
  }

  return resolved
}

// Generate privacy warning message
export function getPrivacyWarning(options: PrivacyGateOptions): string {
  const { type, path, operation } = options
  const riskLevel = getPrivacyRiskLevel(options)

  const lines: string[] = []

  // Risk indicator
  const riskEmoji = riskLevel === 'high' ? '🔴' : riskLevel === 'medium' ? '🟡' : '🟢'
  lines.push(`${riskEmoji} **Privacy Notice** (${riskLevel} risk)`)
  lines.push('')

  // Operation description
  lines.push(`**Operation:** ${operation}`)

  // Type-specific warnings
  switch (type) {
    case 'filesystem-read':
      lines.push(`**Access:** Read files from your computer`)
      if (path) lines.push(`**Location:** ${formatPathForDisplay(path)}`)
      break

    case 'filesystem-write':
      lines.push(`**Access:** Write files to your computer`)
      if (path) lines.push(`**Location:** ${formatPathForDisplay(path)}`)
      if (isSensitivePath(path!)) {
        lines.push('')
        lines.push('⚠️  **Warning:** This is a sensitive system directory')
      }
      break

    case 'filesystem-browse':
      lines.push(`**Access:** Browse your directory structure`)
      if (path) lines.push(`**Starting at:** ${formatPathForDisplay(path)}`)
      break

    case 'computer-use':
      lines.push(`**Access:** Screenshot capture + mouse/keyboard control`)
      lines.push('⚠️  **Warning:** AI can see and control your screen')
      break

    case 'system-command':
      lines.push(`**Access:** Execute system commands`)
      lines.push('⚠️  **Warning:** Commands have full system access')
      break

    case 'network-access':
      lines.push(`**Access:** Internet/network access`)
      break
  }

  lines.push('')
  lines.push('**Privacy:** NeoCode is privacy-first with zero telemetry')
  lines.push('**Data:** All operations stay local on your machine')

  return lines.join('\n')
}

// Check if privacy gates are enabled (can be disabled in config)
export function arePrivacyGatesEnabled(): boolean {
  const config = getGlobalConfig() as any
  // Privacy gates are enabled by default, can be explicitly disabled
  return config.privacyGatesEnabled !== false
}

// Enable/disable privacy gates globally
export function setPrivacyGatesEnabled(enabled: boolean): void {
  saveGlobalConfig(prev => ({
    ...(prev as any),
    privacyGatesEnabled: enabled,
  }))
}
