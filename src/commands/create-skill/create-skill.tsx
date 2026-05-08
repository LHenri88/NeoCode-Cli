import * as React from 'react'
import { useEffect } from 'react'
import * as fs from 'fs'
import * as path from 'path'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandContext } from '../../commands.js'
import type { LocalJSXCommandOnDone } from '../../types/command.js'
import { getCwd } from '../../utils/cwd.js'

type Step = { label: string; ok: boolean }

type CreateSkillResultProps = {
  skillName: string
  steps: Step[]
  error?: string
  onDone: LocalJSXCommandOnDone
}

function CreateSkillResult({
  skillName,
  steps,
  error,
  onDone,
}: CreateSkillResultProps): React.ReactNode {
  useEffect(() => {
    // Build success message
    const successMessage = error
      ? `Failed to create skill: ${error}`
      : `✓ Created skill: .neo/skills/${skillName}/\n\nNext steps:\n  1. Edit .neo/skills/${skillName}/SKILL.md\n  2. Update description, when_to_use and implementation\n  3. Test with: /${skillName}`

    const timer = setTimeout(() => onDone(successMessage, { display: 'system' }), 0)
    return () => clearTimeout(timer)
  }, [onDone, skillName, error])

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text dimColor>{`> /create-skill ${skillName}`}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1} paddingLeft={1}>
        {steps.map((step, i) => (
          <Text key={i} color={step.ok ? 'green' : 'red'}>
            {step.ok ? '✓' : '✗'} {step.label}
          </Text>
        ))}

        {error && (
          <Text color="red" marginTop={1}>
            {error}
          </Text>
        )}
      </Box>

      {!error && (
        <Box flexDirection="column" marginTop={1} paddingLeft={1}>
          <Text dimColor>Next steps:</Text>
          <Text dimColor>{`  1. Edit .neo/skills/${skillName}/SKILL.md`}</Text>
          <Text dimColor>{`  2. Update description, when_to_use and implementation`}</Text>
          <Text dimColor>{`  3. Test with: /${skillName}`}</Text>
        </Box>
      )}
    </Box>
  )
}

function buildSkillContent(
  skillName: string,
  description: string,
  whenToUse: string,
  arguments_: string[],
  argumentHint: string,
  implementation: string,
): string {
  const title = skillName
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  const argsList = arguments_.length > 0
    ? arguments_.map((arg) => `  - ${arg}`).join('\n')
    : '  - arg1'

  const argsSection = arguments_.length > 0
    ? arguments_.map((arg) => `- \`${arg}\`: Description of ${arg}`).join('\n')
    : '- `arg1`: Description of first argument'

  return `---
name: ${title}
description: ${description}
when_to_use: ${whenToUse}
user-invocable: true
version: 1.0.0
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
arguments:
${argsList}
argument-hint: ${argumentHint}
---

# ${title}

## Purpose

${description}

## Usage

\`\`\`bash
/${skillName} ${argumentHint}
\`\`\`

## Arguments

${argsSection}

## Implementation

${implementation}

## Examples

\`\`\`bash
# Example usage
/${skillName} ${argumentHint.replace(/[<>]/g, 'example')}
\`\`\`

## Notes

Additional notes or considerations can be added here.
`
}

function buildReadmeContent(skillName: string, description: string): string {
  const title = skillName
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return `# ${title}

${description}

## Installation

This skill is automatically loaded from \`.neo/skills/${skillName}/\`

## Usage

\`\`\`bash
/${skillName} [arguments]
\`\`\`

## Documentation

See [SKILL.md](./SKILL.md) for full documentation.
`
}

function createSkillFiles(
  skillName: string,
  description: string,
  whenToUse: string,
  arguments_: string[],
  argumentHint: string,
  implementation: string,
): { steps: Step[]; error?: string } {
  const skillDir = `.neo/skills/${skillName}`
  const workingDir = getCwd()
  const fullSkillDir = path.join(workingDir, skillDir)
  const fullSkillMdPath = path.join(fullSkillDir, 'SKILL.md')
  const fullReadmePath = path.join(fullSkillDir, 'README.md')

  const steps: Step[] = []

  if (fs.existsSync(fullSkillDir)) {
    return {
      steps,
      error: `Skill directory already exists: ${skillDir}`,
    }
  }

  try {
    fs.mkdirSync(fullSkillDir, { recursive: true })
    steps.push({ label: `Created directory: ${skillDir}/`, ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    steps.push({ label: `Failed to create directory: ${msg}`, ok: false })
    return { steps, error: msg }
  }

  try {
    const skillContent = buildSkillContent(
      skillName,
      description,
      whenToUse,
      arguments_,
      argumentHint,
      implementation,
    )
    fs.writeFileSync(fullSkillMdPath, skillContent, 'utf-8')
    steps.push({ label: `Created ${skillDir}/SKILL.md`, ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    steps.push({ label: `Failed to create SKILL.md: ${msg}`, ok: false })
    return { steps, error: msg }
  }

  try {
    const readmeContent = buildReadmeContent(skillName, description)
    fs.writeFileSync(fullReadmePath, readmeContent, 'utf-8')
    steps.push({ label: `Created ${skillDir}/README.md`, ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    steps.push({ label: `Failed to create README.md: ${msg}`, ok: false })
    return { steps, error: msg }
  }

  return { steps }
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  _context: LocalJSXCommandContext,
  args: string,
): Promise<React.ReactNode> {
  const parts = args?.trim().split('\n') || []
  const skillName = parts[0]?.trim()

  if (!skillName) {
    const message =
      'Usage: /create-skill <skill-name>\nExample: /create-skill my-awesome-skill'
    onDone(message, { display: 'system' })
    return null
  }

  const validNamePattern = /^[a-z0-9-]+$/
  if (!validNamePattern.test(skillName)) {
    onDone(
      'Invalid skill name. Use lowercase letters, numbers, and hyphens only.\nExample: my-skill-name',
      { display: 'system' },
    )
    return null
  }

  // Check if skill already exists
  const skillDir = `.neo/skills/${skillName}`
  const workingDir = getCwd()
  const fullSkillDir = path.join(workingDir, skillDir)

  if (fs.existsSync(fullSkillDir)) {
    onDone(`Skill directory already exists: ${skillDir}`, { display: 'system' })
    return null
  }

  // Check if structured details were provided
  const hasStructuredDetails = args.includes('Description:') && args.includes('Implementation:')

  if (!hasStructuredDetails) {
    // No structured details - just acknowledge and let the model handle it
    onDone(`Creating skill "${skillName}"...`, { display: 'system' })
    return null
  }

  // Parse structured format
  const text = args
  const lines = text.split('\n')

  let description = 'Brief description of what this skill does'
  let whenToUse = 'When to invoke this skill'
  let arguments_: string[] = []
  let argumentHint = '<arg1>'
  let implementation = 'Detailed step-by-step instructions for how to execute this skill.'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.toLowerCase().startsWith('description:')) {
      description = line.substring('description:'.length).trim()
    } else if (line.toLowerCase().startsWith('when to use:')) {
      whenToUse = line.substring('when to use:'.length).trim()
    } else if (line.toLowerCase().startsWith('arguments:')) {
      const argsStr = line.substring('arguments:'.length).trim()
      if (argsStr.toLowerCase() !== 'none') {
        arguments_ = argsStr.split(',').map((a: string) => a.trim())
      }
    } else if (line.toLowerCase().startsWith('argument hint:')) {
      argumentHint = line.substring('argument hint:'.length).trim()
    } else if (line.toLowerCase().startsWith('implementation:')) {
      // Collect all following lines as implementation
      const implLines = []
      for (let j = i + 1; j < lines.length; j++) {
        implLines.push(lines[j])
      }
      implementation = implLines.join('\n').trim()
      break
    }
  }

  // Create the skill files
  const result = createSkillFiles(
    skillName,
    description,
    whenToUse,
    arguments_,
    argumentHint,
    implementation,
  )

  return (
    <CreateSkillResult
      skillName={skillName}
      steps={result.steps}
      error={result.error}
      onDone={onDone}
    />
  )
}
