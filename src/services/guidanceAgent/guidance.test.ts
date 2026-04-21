import { afterEach, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  loadGuidanceContext,
  loadGuidancePrompt,
  resolveGuidancePath,
} from './guidance.ts'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })),
  )
})

async function makeProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'neocode-guidance-'))
  tempDirs.push(dir)
  return dir
}

test('prefers .neocode guidance over legacy .claude guidance', async () => {
  const cwd = await makeProject()
  await mkdir(join(cwd, '.claude'), { recursive: true })
  await mkdir(join(cwd, '.neocode'), { recursive: true })
  await writeFile(join(cwd, '.claude', 'guidance.md'), 'legacy', 'utf8')
  await writeFile(join(cwd, '.neocode', 'guidance.md'), 'current', 'utf8')

  expect(await resolveGuidancePath(cwd)).toBe(
    join(cwd, '.neocode', 'guidance.md'),
  )
})

test('falls back to legacy .claude guidance when .neocode guidance is absent', async () => {
  const cwd = await makeProject()
  await mkdir(join(cwd, '.claude'), { recursive: true })
  await writeFile(join(cwd, '.claude', 'guidance.md'), 'legacy', 'utf8')

  const guidance = await loadGuidanceContext(cwd)

  expect(guidance).toEqual({
    path: join(cwd, '.claude', 'guidance.md'),
    content: 'legacy',
  })
})

test('formats a prompt section when guidance exists', async () => {
  const cwd = await makeProject()
  await mkdir(join(cwd, '.neocode'), { recursive: true })
  await writeFile(
    join(cwd, '.neocode', 'guidance.md'),
    '# Team guidance\nUse concise status updates.',
    'utf8',
  )

  const prompt = await loadGuidancePrompt(cwd)

  expect(prompt).toContain('# Guidance Agent')
  expect(prompt).toContain('.neocode')
  expect(prompt).toContain('Use concise status updates.')
})
