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
    const timer = setTimeout(() => onDone(), 0)
    return () => clearTimeout(timer)
  }, [onDone])

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
          <Text dimColor>{`  1. Edit .claude/skills/${skillName}/SKILL.md`}</Text>
          <Text dimColor>{`  2. Update description, when_to_use and implementation`}</Text>
          <Text dimColor>{`  3. Test with: /${skillName}`}</Text>
        </Box>
      )}
    </Box>
  )
}

function buildSkillContent(skillName: string): string {
  const title = skillName
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return `---
name: ${title}
description: Brief description of what this skill does
when_to_use: When to invoke this skill
user-invocable: true
version: 1.0.0
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
arguments:
  - arg1
argument-hint: <arg1>
---

# ${title}

## Purpose

Explain what this skill does and why it exists.

## Usage

\`\`\`bash
/${skillName} <arg1>
\`\`\`

## Arguments

- \`arg1\`: Description of first argument

## Implementation

Provide the detailed instructions for the AI agent to follow when executing this skill.

### Step 1: Gather Information

Describe what information to collect first.

### Step 2: Process Data

Describe the main processing logic.

### Step 3: Generate Output

Describe what output to produce.

## Examples

\`\`\`bash
# Example usage
/${skillName} example-value
\`\`\`

## Notes

Any additional notes or considerations.
`
}

function buildReadmeContent(skillName: string): string {
  const title = skillName
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return `# ${title}

Brief description of the skill.

## Installation

This skill is automatically loaded from \`.claude/skills/${skillName}/\`

## Usage

\`\`\`bash
/${skillName} [arguments]
\`\`\`

## Documentation

See [SKILL.md](./SKILL.md) for full documentation.
`
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  _context: LocalJSXCommandContext,
  args: string,
): Promise<React.ReactNode> {
  const skillName = args?.trim()

  if (!skillName) {
    onDone(
      'Usage: /create-skill <skill-name>\nExample: /create-skill my-awesome-skill',
      { display: 'system' },
    )
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

  const skillDir = `.claude/skills/${skillName}`
  const workingDir = getCwd()
  const fullSkillDir = path.join(workingDir, skillDir)
  const fullSkillMdPath = path.join(fullSkillDir, 'SKILL.md')
  const fullReadmePath = path.join(fullSkillDir, 'README.md')

  const steps: Step[] = []

  if (fs.existsSync(fullSkillDir)) {
    onDone(`Skill directory already exists: ${skillDir}`, { display: 'system' })
    return null
  }

  try {
    fs.mkdirSync(fullSkillDir, { recursive: true })
    steps.push({ label: `Created directory: ${skillDir}/`, ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    steps.push({ label: `Failed to create directory: ${msg}`, ok: false })
    return (
      <CreateSkillResult
        skillName={skillName}
        steps={steps}
        error={msg}
        onDone={onDone}
      />
    )
  }

  try {
    fs.writeFileSync(fullSkillMdPath, buildSkillContent(skillName), 'utf-8')
    steps.push({ label: `Created ${skillDir}/SKILL.md`, ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    steps.push({ label: `Failed to create SKILL.md: ${msg}`, ok: false })
    return (
      <CreateSkillResult
        skillName={skillName}
        steps={steps}
        error={msg}
        onDone={onDone}
      />
    )
  }

  try {
    fs.writeFileSync(fullReadmePath, buildReadmeContent(skillName), 'utf-8')
    steps.push({ label: `Created ${skillDir}/README.md`, ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    steps.push({ label: `Failed to create README.md: ${msg}`, ok: false })
    return (
      <CreateSkillResult
        skillName={skillName}
        steps={steps}
        error={msg}
        onDone={onDone}
      />
    )
  }

  return (
    <CreateSkillResult skillName={skillName} steps={steps} onDone={onDone} />
  )
}
