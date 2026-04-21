import { afterEach, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  buildMemoryPalaceGraphSummary,
  searchMemoryPalace,
} from './index.ts'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })),
  )
})

async function makePalace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'neocode-palace-'))
  tempDirs.push(dir)
  return dir
}

test('searchMemoryPalace ranks matching files by occurrence count', async () => {
  const root = await makePalace()
  await mkdir(join(root, 'architecture'), { recursive: true })
  await writeFile(
    join(root, 'architecture', 'system.md'),
    'guidance guidance interface provider',
    'utf8',
  )
  await writeFile(join(root, 'notes.md'), 'guidance once', 'utf8')

  const results = await searchMemoryPalace('guidance', root)

  expect(results).toHaveLength(2)
  expect(results[0]?.path).toContain('system.md')
  expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0)
})

test('buildMemoryPalaceGraphSummary groups wings and rooms', async () => {
  const root = await makePalace()
  await mkdir(join(root, 'wing-a', 'room-1'), { recursive: true })
  await mkdir(join(root, 'wing-b'), { recursive: true })
  await writeFile(join(root, 'wing-a', 'room-1', 'entry.md'), 'alpha', 'utf8')
  await writeFile(join(root, 'wing-b', 'entry.md'), 'beta', 'utf8')

  const summary = await buildMemoryPalaceGraphSummary(root)

  expect(summary.fileCount).toBe(2)
  expect(summary.wings.find(wing => wing.name === 'wing-a')?.roomCount).toBe(1)
  expect(
    summary.rooms.find(room => room.wing === 'wing-a' && room.name === 'room-1')
      ?.fileCount,
  ).toBe(1)
})
