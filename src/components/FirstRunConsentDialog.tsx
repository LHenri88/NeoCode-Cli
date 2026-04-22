/**
 * FirstRunConsentDialog - One-time privacy agreement shown on first CLI launch
 */

import * as React from 'react'
import { Box, Text } from '../ink.js'
import { useInput } from '../ink.js'
import {
  getFirstRunConsentMessage,
  getFullPrivacyPolicy,
  saveFirstRunConsent,
} from '../utils/permissions/firstRunConsent.js'

export interface FirstRunConsentDialogProps {
  onComplete: (accepted: boolean) => void
}

type ViewMode = 'consent' | 'policy'

export function FirstRunConsentDialog({
  onComplete,
}: FirstRunConsentDialogProps): React.ReactNode {
  const [mode, setMode] = React.useState<ViewMode>('consent')
  const [scrollOffset, setScrollOffset] = React.useState(0)

  const message = mode === 'consent' ? getFirstRunConsentMessage() : getFullPrivacyPolicy()
  const lines = message.split('\n')

  // Handle input
  useInput((input, key) => {
    if (mode === 'policy') {
      // In policy view, any key returns to consent
      if (key.return || key.escape || input) {
        setMode('consent')
        setScrollOffset(0)
      }
      // Arrow keys for scrolling
      if (key.upArrow) {
        setScrollOffset(Math.max(0, scrollOffset - 1))
      }
      if (key.downArrow) {
        setScrollOffset(Math.min(lines.length - 20, scrollOffset + 1))
      }
      return
    }

    // In consent view
    const inputLower = input.toLowerCase()

    if (inputLower === 'y' || key.return) {
      // Accept
      saveFirstRunConsent(true)
      onComplete(true)
    } else if (inputLower === 'n' || key.escape) {
      // Decline
      saveFirstRunConsent(false)
      onComplete(false)
    } else if (inputLower === 'r') {
      // Read policy
      setMode('policy')
      setScrollOffset(0)
    }
  })

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {mode === 'consent' ? (
        // Consent message
        <>
          {lines.map((line, i) => (
            <Text key={i}>
              {line}
            </Text>
          ))}
        </>
      ) : (
        // Policy view (scrollable)
        <>
          <Box marginBottom={1}>
            <Text bold color="cyan">
              Full Privacy Policy (↑↓ to scroll, any key to return)
            </Text>
          </Box>
          {lines.slice(scrollOffset, scrollOffset + 20).map((line, i) => (
            <Text key={i}>
              {line}
            </Text>
          ))}
          {scrollOffset + 20 < lines.length && (
            <Box marginTop={1}>
              <Text dimColor>
                ... {lines.length - (scrollOffset + 20)} more lines (↓ to scroll)
              </Text>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

/**
 * Wrapper that checks if consent is needed and shows dialog if required
 */
export function FirstRunConsentWrapper({
  children,
  onConsentComplete,
}: {
  children: React.ReactNode
  onConsentComplete?: (accepted: boolean) => void
}): React.ReactNode {
  const [needsConsent, setNeedsConsent] = React.useState<boolean | null>(null)
  const [consentGiven, setConsentGiven] = React.useState(false)

  React.useEffect(() => {
    // Check on mount
    const { hasFirstRunConsent } = require('../utils/permissions/firstRunConsent.js')
    setNeedsConsent(!hasFirstRunConsent())
  }, [])

  const handleComplete = (accepted: boolean) => {
    setConsentGiven(accepted)
    setNeedsConsent(false)
    onConsentComplete?.(accepted)

    if (!accepted) {
      // User declined - exit
      process.exit(0)
    }
  }

  // Still checking
  if (needsConsent === null) {
    return null
  }

  // Needs consent
  if (needsConsent) {
    return <FirstRunConsentDialog onComplete={handleComplete} />
  }

  // Consent given or already exists
  return <>{children}</>
}
