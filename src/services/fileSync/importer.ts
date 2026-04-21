import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs'
import { basename, dirname, isAbsolute, join, relative } from 'path'
import { homedir } from 'os'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'

// ── Limits ───────────────────────────────────────────────────────────────────

const MAX_FILES = 500
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

// ── Path helpers ─────────────────────────────────────────────────────────────

export function getGlobalSkillsDir(): string {
  return join(getClaudeConfigHomeDir(), 'global-skills')
}

/**
 * Resolve user-supplied paths safely — no shell involved.
 * Handles: Windows absolute (C:\...), tilde (~), Unix absolute (/...) and relative.
 */
export function resolveImportPath(input: string, cwd: string): string {
  const trimmed = input.trim()
  // Windows absolute path: C:\ or C:/ — must be checked before tilde
  if (/^[a-zA-Z]:[/\\]/.test(trimmed)) return trimmed
  // Tilde expansion
  if (trimmed.startsWith('~/') || trimmed === '~') {
    return join(homedir(), trimmed.slice(2))
  }
  // Unix / cross-platform absolute
  if (isAbsolute(trimmed)) return trimmed
  // Relative to cwd
  return join(cwd, trimmed)
}

// ── Types ────────────────────────────────────────────────────────────────────

export type ImportOptions = {
  overwrite?: boolean
  dryRun?: boolean
  maxFiles?: number
}

export type ImportResult = {
  copied: string[]
  skipped: string[]
  errors: string[]
  dryRun: boolean
}

// ── Core import ──────────────────────────────────────────────────────────────

export async function importPath(
  sourcePath: string,
  targetDir: string,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const { overwrite = false, dryRun = false, maxFiles = MAX_FILES } = options

  if (!existsSync(sourcePath)) {
    throw new Error(`Source does not exist: ${sourcePath}`)
  }

  const result: ImportResult = { copied: [], skipped: [], errors: [], dryRun }
  const stats = statSync(sourcePath)

  if (!dryRun) mkdirSync(targetDir, { recursive: true })

  if (stats.isFile()) {
    const dest = join(targetDir, basename(sourcePath))
    copyOne(sourcePath, dest, result, overwrite, dryRun)
  } else if (stats.isDirectory()) {
    walk(sourcePath, sourcePath, targetDir, result, { overwrite, dryRun, maxFiles })
  } else {
    throw new Error(`Source is neither a file nor a directory: ${sourcePath}`)
  }

  return result
}

function walk(
  root: string,
  current: string,
  targetBase: string,
  result: ImportResult,
  opts: Required<ImportOptions>,
): void {
  if (result.copied.length >= opts.maxFiles) {
    if (!result.errors.some(e => e.startsWith('Limit'))) {
      result.errors.push(`Limit reached: only first ${opts.maxFiles} files processed`)
    }
    return
  }

  let entries: ReturnType<typeof readdirSync>
  try {
    entries = readdirSync(current, { withFileTypes: true })
  } catch {
    result.errors.push(`Cannot read directory: ${relative(root, current)}`)
    return
  }

  for (const entry of entries) {
    // Skip hidden files and directories (e.g. .git, .env)
    if (entry.name.startsWith('.')) continue

    const src = join(current, entry.name)
    const rel = relative(root, src)
    const dest = join(targetBase, rel)

    if (entry.isDirectory()) {
      if (!opts.dryRun) mkdirSync(dest, { recursive: true })
      walk(root, src, targetBase, result, opts)
    } else if (entry.isFile()) {
      try {
        const size = statSync(src).size
        if (size > MAX_FILE_SIZE_BYTES) {
          result.skipped.push(`${rel} (${(size / 1024 / 1024).toFixed(1)}MB > ${MAX_FILE_SIZE_MB}MB limit)`)
          continue
        }
      } catch {
        result.errors.push(`Cannot stat: ${rel}`)
        continue
      }
      copyOne(src, dest, result, opts.overwrite, opts.dryRun)
    }
  }
}

function copyOne(
  src: string,
  dest: string,
  result: ImportResult,
  overwrite: boolean,
  dryRun: boolean,
): void {
  if (existsSync(dest) && !overwrite) {
    result.skipped.push(basename(dest))
    return
  }
  try {
    if (!dryRun) {
      mkdirSync(dirname(dest), { recursive: true })
      copyFileSync(src, dest)
    }
    result.copied.push(basename(dest))
  } catch (err) {
    result.errors.push(`${basename(src)}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ── Global Skills Registry ───────────────────────────────────────────────────

export type SkillEntry = {
  name: string
  path: string
  addedAt: string
}

function getRegistryPath(): string {
  return join(getGlobalSkillsDir(), 'registry.json')
}

export function listGlobalSkills(): SkillEntry[] {
  const regPath = getRegistryPath()
  if (!existsSync(regPath)) return []
  try {
    return JSON.parse(readFileSync(regPath, 'utf-8')) as SkillEntry[]
  } catch {
    return []
  }
}

export function saveGlobalSkill(name: string, sourcePath: string): SkillEntry {
  mkdirSync(getGlobalSkillsDir(), { recursive: true })
  const existing = listGlobalSkills().filter(s => s.name !== name)
  const entry: SkillEntry = { name, path: sourcePath, addedAt: new Date().toISOString() }
  writeFileSync(getRegistryPath(), JSON.stringify([...existing, entry], null, 2), 'utf-8')
  return entry
}

export function removeGlobalSkill(name: string): boolean {
  const existing = listGlobalSkills()
  const filtered = existing.filter(s => s.name !== name)
  if (filtered.length === existing.length) return false
  writeFileSync(getRegistryPath(), JSON.stringify(filtered, null, 2), 'utf-8')
  return true
}

export function findGlobalSkill(name: string): SkillEntry | undefined {
  return listGlobalSkills().find(s => s.name === name)
}
