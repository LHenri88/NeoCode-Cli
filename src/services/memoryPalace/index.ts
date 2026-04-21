import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'

import { getAutoMemPath } from '../../memdir/paths.js'

const SEARCHABLE_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.json',
  '.yaml',
  '.yml',
])

const MAX_FILE_BYTES = 256 * 1024

export type MemoryPalaceSearchResult = {
  path: string
  score: number
  excerpt: string
}

export type MemoryPalaceGraphSummary = {
  root: string
  fileCount: number
  wings: Array<{ name: string; fileCount: number; roomCount: number }>
  rooms: Array<{ wing: string; name: string; fileCount: number }>
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function walkMemoryFiles(root: string): Promise<string[]> {
  if (!(await fileExists(root))) {
    return []
  }

  const results: string[] = []
  const pending = [root]

  while (pending.length > 0) {
    const current = pending.pop()
    if (!current) {
      continue
    }

    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const entryPath = join(current, entry.name)
      if (entry.isDirectory()) {
        pending.push(entryPath)
        continue
      }

      const extension = entry.name.slice(entry.name.lastIndexOf('.'))
      if (!SEARCHABLE_EXTENSIONS.has(extension)) {
        continue
      }

      const info = await stat(entryPath)
      if (info.size <= MAX_FILE_BYTES) {
        results.push(entryPath)
      }
    }
  }

  return results.sort((a, b) => a.localeCompare(b))
}

function buildExcerpt(content: string, query: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  const lower = normalized.toLowerCase()
  const index = lower.indexOf(query.toLowerCase())
  if (index === -1) {
    return normalized.slice(0, 160)
  }

  const start = Math.max(0, index - 60)
  const end = Math.min(normalized.length, index + query.length + 100)
  const excerpt = normalized.slice(start, end)
  return start > 0 ? `...${excerpt}` : excerpt
}

export async function searchMemoryPalace(
  query: string,
  root = getAutoMemPath(),
): Promise<MemoryPalaceSearchResult[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return []
  }

  const terms = trimmedQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  const files = await walkMemoryFiles(root)
  const results: MemoryPalaceSearchResult[] = []

  for (const path of files) {
    const content = await readFile(path, 'utf8')
    const lower = content.toLowerCase()
    const score = terms.reduce((sum, term) => {
      let count = 0
      let index = lower.indexOf(term)
      while (index !== -1) {
        count += 1
        index = lower.indexOf(term, index + term.length)
      }
      return sum + count
    }, 0)

    if (score > 0) {
      results.push({
        path,
        score,
        excerpt: buildExcerpt(content, trimmedQuery),
      })
    }
  }

  return results.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
}

export async function buildMemoryPalaceGraphSummary(
  root = getAutoMemPath(),
): Promise<MemoryPalaceGraphSummary> {
  const files = await walkMemoryFiles(root)
  const wingCounts = new Map<string, number>()
  const roomCounts = new Map<string, number>()

  for (const path of files) {
    const rel = relative(root, path)
    const parts = rel.split(/[\\/]/).filter(Boolean)
    const wing = parts[0] ?? 'root'
    const room = parts.length > 2 ? parts[1] : null

    wingCounts.set(wing, (wingCounts.get(wing) ?? 0) + 1)
    if (room) {
      const key = `${wing}::${room}`
      roomCounts.set(key, (roomCounts.get(key) ?? 0) + 1)
    }
  }

  const rooms = [...roomCounts.entries()]
    .map(([key, fileCount]) => {
      const [wing, name] = key.split('::')
      return { wing, name, fileCount }
    })
    .sort((a, b) => b.fileCount - a.fileCount || a.name.localeCompare(b.name))

  const wings = [...wingCounts.entries()]
    .map(([name, fileCount]) => ({
      name,
      fileCount,
      roomCount: rooms.filter(room => room.wing === name).length,
    }))
    .sort((a, b) => b.fileCount - a.fileCount || a.name.localeCompare(b.name))

  return {
    root,
    fileCount: files.length,
    wings,
    rooms,
  }
}

export function formatMemoryPalaceGraphSummary(
  summary: MemoryPalaceGraphSummary,
): string {
  const wingLines =
    summary.wings.length > 0
      ? summary.wings
          .slice(0, 8)
          .map(
            wing =>
              `- ${wing.name}: ${wing.fileCount} files, ${wing.roomCount} rooms`,
          )
          .join('\n')
      : '- No wings discovered yet'

  const roomLines =
    summary.rooms.length > 0
      ? summary.rooms
          .slice(0, 10)
          .map(
            room => `- ${room.wing}/${room.name}: ${room.fileCount} files`,
          )
          .join('\n')
      : '- No rooms discovered yet'

  return [
    `Memory Palace root: ${summary.root}`,
    `Total indexed files: ${summary.fileCount}`,
    '',
    'Wings:',
    wingLines,
    '',
    'Rooms:',
    roomLines,
  ].join('\n')
}
