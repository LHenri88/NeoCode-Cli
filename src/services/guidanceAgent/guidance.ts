import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

export type GuidanceContext = {
  path: string
  content: string
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export async function resolveGuidancePath(cwd: string): Promise<string | null> {
  const candidates = [
    join(cwd, '.neocode', 'guidance.md'),
    join(cwd, '.claude', 'guidance.md'),
  ]

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate
    }
  }

  return null
}

export async function loadGuidanceContext(
  cwd: string,
): Promise<GuidanceContext | null> {
  const guidancePath = await resolveGuidancePath(cwd)
  if (!guidancePath) {
    return null
  }

  const content = (await readFile(guidancePath, 'utf8')).trim()
  if (!content) {
    return null
  }

  return {
    path: guidancePath,
    content,
  }
}

export async function loadGuidancePrompt(cwd: string): Promise<string | null> {
  const guidance = await loadGuidanceContext(cwd)
  if (!guidance) {
    return null
  }

  return `# Guidance Agent

Load and apply this project guidance from \`${guidance.path}\`.

${guidance.content}`
}
