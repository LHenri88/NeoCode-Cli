import { randomUUID } from 'node:crypto'
import { mkdir, appendFile, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'

export type BtwBufferEntry = {
  id: string
  question: string
  response: string
  createdAt: string
}

export function getBtwBufferPath(configHomeDir = getClaudeConfigHomeDir()): string {
  return join(configHomeDir, 'btw-buffer.jsonl')
}

export function createBtwBufferEntry(
  question: string,
  response: string,
  now = new Date(),
): BtwBufferEntry {
  return {
    id: randomUUID(),
    question,
    response,
    createdAt: now.toISOString(),
  }
}

export async function appendBtwBufferEntry(
  entry: BtwBufferEntry,
  filePath = getBtwBufferPath(),
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await appendFile(filePath, `${JSON.stringify(entry)}\n`, 'utf8')
}

export async function listBtwBufferEntries(
  filePath = getBtwBufferPath(),
): Promise<BtwBufferEntry[]> {
  try {
    const raw = await readFile(filePath, 'utf8')
    return raw
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .flatMap(line => {
        try {
          return [JSON.parse(line) as BtwBufferEntry]
        } catch {
          return []
        }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}
