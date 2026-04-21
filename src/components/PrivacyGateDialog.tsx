/**
 * PrivacyGateDialog - User consent dialog for privacy-sensitive operations
 */

import * as React from 'react'
import { Box, Text } from '../ink.js'
import { Dialog } from './design-system/Dialog.js'
import { Select } from './CustomSelect/index.js'
import type { OptionWithDescription } from './CustomSelect/index.js'
import {
  type PrivacyGateOptions,
  type PrivacyGateResult,
  type ConsentScope,
  getPrivacyWarning,
  getPrivacyRiskLevel,
  hasConsent,
  saveConsent,
} from '../utils/permissions/privacyGates.js'

export interface PrivacyGateDialogProps {
  options: PrivacyGateOptions
  onDecision: (result: PrivacyGateResult) => void
}

export function PrivacyGateDialog({
  options,
  onDecision,
}: PrivacyGateDialogProps): React.ReactNode {
  // Check if already has consent
  React.useEffect(() => {
    if (hasConsent(options.type, options.path)) {
      onDecision({ approved: true })
    }
  }, [options, onDecision])

  const riskLevel = getPrivacyRiskLevel(options)
  const warning = getPrivacyWarning(options)
  const allowPermanent = options.allowPermanent !== false

  // Build options based on risk level
  const choices: OptionWithDescription<string>[] = []

  // Always offer one-time approval
  choices.push({
    label: '✓ Allow once',
    value: 'once',
    description: 'Grant access for this single operation',
  })

  // Session approval for medium/low risk
  if (riskLevel !== 'high') {
    choices.push({
      label: '✓ Allow for session',
      value: 'session',
      description: 'Valid until you close NeoCode',
    })
  }

  // Permanent approval only for low risk
  if (riskLevel === 'low' && allowPermanent) {
    choices.push({
      label: '✓ Always allow',
      value: 'permanent',
      description: 'Remember this choice permanently',
    })
  }

  // Deny option
  choices.push({
    label: '✗ Deny',
    value: 'deny',
    description: 'Do not grant access',
  })

  const handleChoice = (value: string) => {
    if (value === 'deny') {
      onDecision({ approved: false })
      return
    }

    const scope = value as ConsentScope

    // Save consent
    if (scope === 'session' || scope === 'permanent') {
      saveConsent(options.type, scope, options.path)
    }

    onDecision({
      approved: true,
      scope,
      rememberChoice: scope !== 'once',
    })
  }

  const handleCancel = () => {
    onDecision({ approved: false })
  }

  // Color based on risk
  const dialogColor = riskLevel === 'high' ? 'error' : riskLevel === 'medium' ? 'warning' : 'suggestion'

  return (
    <Dialog
      title="Privacy Approval Required"
      subtitle={options.operation}
      onCancel={handleCancel}
      color={dialogColor}
    >
      <Box flexDirection="column" gap={1} marginBottom={1}>
        {/* Warning message */}
        {warning.split('\n').map((line, i) => {
          const isBold = line.startsWith('**') && line.endsWith('**')
          const text = isBold ? line.slice(2, -2) : line

          return (
            <Text key={i} bold={isBold} dimColor={!isBold && !line.includes('⚠️')}>
              {text}
            </Text>
          )
        })}
      </Box>

      {/* Choices */}
      <Select
        options={choices}
        onChange={handleChoice}
        onCancel={handleCancel}
        visibleOptionCount={6}
      />

      {/* Help text */}
      <Box marginTop={1}>
        <Text dimColor>
          Choose your preference · Esc to deny
        </Text>
      </Box>
    </Dialog>
  )
}

/**
 * Hook to request privacy consent
 */
export function usePrivacyGate(
  options: PrivacyGateOptions
): {
  requestConsent: () => Promise<PrivacyGateResult>
  hasExistingConsent: () => boolean
} {
  const hasExistingConsent = React.useCallback(() => {
    return hasConsent(options.type, options.path)
  }, [options])

  const requestConsent = React.useCallback((): Promise<PrivacyGateResult> => {
    // If already has consent, approve immediately
    if (hasConsent(options.type, options.path)) {
      return Promise.resolve({ approved: true })
    }

    // Otherwise, need to show dialog (handled by component)
    return new Promise<PrivacyGateResult>((resolve) => {
      // This will be resolved by the dialog component
      // In practice, this is handled by the component rendering
      resolve({ approved: false })
    })
  }, [options])

  return { requestConsent, hasExistingConsent }
}
