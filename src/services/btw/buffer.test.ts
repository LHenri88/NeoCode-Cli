import { afterEach, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  appendBtwBufferEntry,
  createBtwBufferEntry,
  listBtwBufferEntries,
} from './buffer.ts'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })),
  )
})

async function makeBufferPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'neocode-btw-'))
  tempDirs.push(dir)
  return join(dir, 'btw-buffer.jsonl')
}

test('stores and reads buffered btw entries in reverse chronological order', async () => {
  const bufferPath = await makeBufferPath()

  await appendBtwBufferEntry(
    createBtwBufferEntry('first', 'alpha', new Date('2026-04-09T10:00:00.000Z')),
    bufferPath,
  )
  await appendBtwBufferEntry(
    createBtwBufferEntry('second', 'beta', new Date('2026-04-09T11:00:00.000Z')),
    bufferPath,
  )

  const entries = await listBtwBufferEntries(bufferPath)

  expect(entries).toHaveLength(2)
  expect(entries[0]?.question).toBe('second')
  expect(entries[1]?.question).toBe('first')
})

test('returns an empty list when no btw buffer exists', async () => {
  const bufferPath = await makeBufferPath()
  const entries = await listBtwBufferEntries(bufferPath)

  expect(entries).toEqual([])
})
