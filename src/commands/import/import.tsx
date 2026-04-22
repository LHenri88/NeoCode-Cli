import * as React from 'react'
import { readdirSync, statSync } from 'fs'
import { basename, dirname, join } from 'path'
import { homedir, platform } from 'os'
import { COMMON_HELP_ARGS, COMMON_INFO_ARGS } from '../../constants/xml.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Select } from '../../components/CustomSelect/index.js'
import type { OptionWithDescription } from '../../components/CustomSelect/index.js'
import { Box, Text } from '../../ink.js'
import type {
  LocalJSXCommandCall,
  LocalJSXCommandOnDone,
} from '../../types/command.js'
import { getCwd } from '../../utils/cwd.js'
import {
  findGlobalSkill,
  importPath,
  listGlobalSkills,
  removeGlobalSkill,
  resolveImportPath,
  saveGlobalSkill,
  type ImportOptions,
  type ImportResult,
} from '../../services/fileSync/importer.js'

// ── Help ─────────────────────────────────────────────────────────────────────

function renderHelp(): string {
  return `Usage: /import [path] [options]

Import files or skill sets from another local project.
With no arguments, opens an interactive directory browser.

Direct import (paths with spaces must use quotes):
  /import "<path>"                   Import a file or directory here
  /import "<path>" --target "<dir>"  Import into a specific subdirectory
  /import "<path>" --overwrite       Overwrite existing files
  /import "<path>" --dry-run         Preview without copying

Global skills registry (cross-project reuse):
  /import skill save <name> "<path>" Save a path as a named skill
  /import skill use <name>           Import a saved skill here
  /import skill use <name> --target  Import skill to a specific directory
  /import skill list                 List all saved skills
  /import skill remove <name>        Remove a saved skill

Examples:
  /import                                         (opens interactive browser)
  /import "C:\\projects\\my-framework\\auth" --target ./src/auth
  /import "~/projects/templates" --dry-run
  /import skill save auth "C:\\projects\\framework\\src\\auth"
  /import skill use auth --target ./src/auth
  /import skill list`
}

// ── Result formatter ──────────────────────────────────────────────────────────

function formatResult(result: ImportResult, source: string, target: string): string {
  const lines: string[] = []
  const verb = result.dryRun ? 'Would copy' : 'Copied'

  lines.push(result.dryRun ? `[DRY RUN] ${source} → ${target}` : `Import complete: ${source} → ${target}`)

  if (result.copied.length > 0) {
    lines.push('', `${verb} (${result.copied.length}):`)
    for (const f of result.copied.slice(0, 20)) lines.push(`  + ${f}`)
    if (result.copied.length > 20) lines.push(`  … and ${result.copied.length - 20} more`)
  }

  if (result.skipped.length > 0) {
    lines.push('', `Skipped (${result.skipped.length}):`)
    for (const f of result.skipped.slice(0, 10)) lines.push(`  - ${f}`)
    if (result.skipped.length > 10) lines.push(`  … and ${result.skipped.length - 10} more`)
  }

  if (result.errors.length > 0) {
    lines.push('', `Errors (${result.errors.length}):`)
    for (const e of result.errors) lines.push(`  ! ${e}`)
  }

  if (result.copied.length === 0 && result.errors.length === 0) {
    lines.push('\nNothing to import — source is empty or all files already exist.')
    lines.push('Tip: use --overwrite to replace existing files.')
  } else if (!result.dryRun && result.copied.length > 0) {
    lines.push('\nTip: next time run with --dry-run first to preview changes.')
  }

  return lines.join('\n')
}

// ── Interactive browser ───────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

/** Returns quick-access roots: all available drives (Windows) or / + home (Unix). */
function getRoots(cwd: string): { label: string; path: string }[] {
  const roots: { label: string; path: string }[] = []
  const home = homedir()

  if (platform() === 'win32') {
    for (let code = 65; code <= 90; code++) {
      const drive = `${String.fromCharCode(code)}:\\`
      try { statSync(drive); roots.push({ label: `💾  ${drive}`, path: drive }) } catch { /* skip */ }
    }
  } else {
    roots.push({ label: '💾  / (root)', path: '/' })
  }

  // Prepend shortcuts (dedup vs drive list)
  const shortcuts: { label: string; path: string }[] = [
    { label: `🏠  Home  (${home})`, path: home },
    { label: `📂  Project  (${cwd})`, path: cwd },
  ]
  for (const s of shortcuts) {
    if (!roots.some(r => r.path === s.path)) roots.unshift(s)
  }

  return roots
}

function buildRootsOptions(cwd: string): OptionWithDescription<string>[] {
  return getRoots(cwd).map(r => ({
    label: r.label,
    value: `nav::${r.path}`,
    description: r.path,
    dimDescription: true,
  }))
}

function buildBrowseOptions(currentPath: string): OptionWithDescription<string>[] {
  const options: OptionWithDescription<string>[] = []

  // Primary action: import the current directory
  options.push({
    label: `✓  Import "${basename(currentPath) || currentPath}"`,
    value: '__IMPORT_DIR__',
    description: currentPath,
    dimDescription: true,
  })

  // Go up — if at drive/fs root, offer Quick Access instead of hiding
  const parent = dirname(currentPath)
  if (parent !== currentPath) {
    options.push({ label: '↑  .. (go up)', value: '__UP__' })
  }

  // Quick Access — always available to jump to any drive or shortcut
  options.push({ label: '🖥  Quick Access (drives & shortcuts)', value: '__ROOTS__' })

  // Directory contents
  try {
    const entries = readdirSync(currentPath, { withFileTypes: true })
      .filter(e => !e.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
        return a.name.localeCompare(b.name)
      })

    for (const entry of entries.slice(0, 60)) {
      const full = join(currentPath, entry.name)
      if (entry.isDirectory()) {
        let desc = ''
        try {
          const n = readdirSync(full).filter(n => !n.startsWith('.')).length
          desc = `${n} item${n !== 1 ? 's' : ''}`
        } catch { /* ignore */ }
        options.push({ label: `📁  ${entry.name}/`, value: `nav::${full}`, description: desc, dimDescription: true })
      } else if (entry.isFile()) {
        let desc = ''
        try { desc = formatSize(statSync(full).size) } catch { /* ignore */ }
        options.push({ label: `    ${entry.name}`, value: `sel::${full}`, description: desc, dimDescription: true })
      }
    }

    if (entries.length > 60) {
      options.push({ label: `    … ${entries.length - 60} more items`, value: '__NONE__', disabled: true })
    }
  } catch {
    options.push({ label: '    (cannot read directory)', value: '__NONE__', disabled: true })
  }

  return options
}

type Phase = 'browse' | 'roots' | 'confirm'

type BrowserProps = {
  onDone: LocalJSXCommandOnDone
  startPath: string
  targetDir: string
}

function FileBrowser({ onDone, startPath, targetDir }: BrowserProps): React.ReactNode {
  const [currentPath, setCurrentPath] = React.useState(startPath)
  const [phase, setPhase] = React.useState<Phase>('browse')
  const [pendingSource, setPendingSource] = React.useState<string>('')
  const [working, setWorking] = React.useState(false)

  const confirmOptions: OptionWithDescription<string>[] = [
    { label: 'Yes, import now', value: 'import' },
    { label: 'Dry-run preview first', value: 'dryrun' },
    { label: '← Back to browser', value: 'back' },
  ]

  const navigate = (path: string) => {
    setCurrentPath(path)
    setPhase('browse')
  }

  const handleBrowse = (value: string) => {
    if (value === '__NONE__') return
    if (value === '__ROOTS__') { setPhase('roots'); return }
    if (value === '__UP__') {
      const up = dirname(currentPath)
      // At drive/fs root — go to Quick Access instead of staying put
      if (up === currentPath) { setPhase('roots'); return }
      navigate(up)
      return
    }
    if (value.startsWith('nav::')) {
      navigate(value.slice(5))
      return
    }
    // Import current dir or a specific file
    const source = value === '__IMPORT_DIR__' ? currentPath : value.slice('sel::'.length)
    setPendingSource(source)
    setPhase('confirm')
  }

  const handleRoots = (value: string) => {
    if (value.startsWith('nav::')) navigate(value.slice(5))
  }

  const handleConfirm = (action: string) => {
    if (action === 'back') { setPhase('browse'); return }
    if (working) return
    setWorking(true)
    importPath(pendingSource, targetDir, { dryRun: action === 'dryrun' })
      .then(result => { onDone(formatResult(result, pendingSource, targetDir), { display: 'system' }) })
      .catch(err => { onDone(`Error: ${err instanceof Error ? err.message : String(err)}`, { display: 'system' }) })
  }

  const handleCancel = () => onDone('Import cancelled.', { display: 'system' })

  // ── Roots / Quick Access ─────────────────────────────────────────────────────
  if (phase === 'roots') {
    return (
      <Dialog
        title="Import — Quick Access"
        subtitle="Choose a drive or shortcut"
        onCancel={handleCancel}
        color="suggestion"
      >
        <Select
          key="roots"
          options={buildRootsOptions(targetDir)}
          onChange={handleRoots}
          onCancel={() => setPhase('browse')}
          visibleOptionCount={12}
        />
        <Box marginTop={1}>
          <Text dimColor>Enter jumps to location · Esc returns to browser</Text>
        </Box>
      </Dialog>
    )
  }

  // ── Browse ───────────────────────────────────────────────────────────────────
  if (phase === 'browse') {
    return (
      <Dialog
        title="Import — File Browser"
        subtitle={currentPath}
        onCancel={handleCancel}
        color="suggestion"
      >
        <Select
          key={currentPath}
          options={buildBrowseOptions(currentPath)}
          onChange={handleBrowse}
          onCancel={handleCancel}
          visibleOptionCount={14}
        />
        <Box marginTop={1}>
          <Text dimColor>Enter navigates · ✓ imports · 🖥 Quick Access changes drive · Esc cancels</Text>
        </Box>
      </Dialog>
    )
  }

  // ── Confirm ──────────────────────────────────────────────────────────────────
  const dest = join(targetDir, basename(pendingSource))
  return (
    <Dialog
      title="Confirm Import"
      subtitle={`${pendingSource}  →  ${dest}`}
      onCancel={() => setPhase('browse')}
      color="success"
    >
      {working
        ? <Text>Importing…</Text>
        : <Select
            options={confirmOptions}
            onChange={handleConfirm}
            onCancel={() => setPhase('browse')}
            visibleOptionCount={5}
          />
      }
    </Dialog>
  )
}

// ── Arg parser ────────────────────────────────────────────────────────────────
// Supports paths with spaces: everything before the first --flag is the path.
// Quoted paths (single or double) are also unwrapped.

type Parsed =
  | { cmd: 'browser' }
  | { cmd: 'import'; sourcePath: string; targetDir: string | null; options: ImportOptions }
  | { cmd: 'skill-save'; skillName: string; sourcePath: string }
  | { cmd: 'skill-use'; skillName: string; targetDir: string | null; options: ImportOptions }
  | { cmd: 'skill-list' }
  | { cmd: 'skill-remove'; skillName: string }
  | { cmd: 'help' }

function unquote(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

/** Split args respecting double-quoted segments. */
function tokenize(args: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuote = false
  let quoteChar = ''
  for (const ch of args) {
    if (inQuote) {
      if (ch === quoteChar) { inQuote = false }
      else { current += ch }
    } else if (ch === '"' || ch === "'") {
      inQuote = true
      quoteChar = ch
    } else if (ch === ' ' || ch === '\t') {
      if (current) { tokens.push(current); current = '' }
    } else {
      current += ch
    }
  }
  if (current) tokens.push(current)
  return tokens
}

/** Consume tokens until a --flag, joining with space to rebuild paths-with-spaces. */
function consumePath(tokens: string[], startAt: number): { path: string; nextIdx: number } {
  const parts: string[] = []
  let i = startAt
  while (i < tokens.length && !tokens[i].startsWith('--')) {
    parts.push(tokens[i])
    i++
  }
  return { path: unquote(parts.join(' ')).trim(), nextIdx: i }
}

function parseFlags(tokens: string[], startAt: number): { targetDir: string | null; options: ImportOptions } {
  const options: ImportOptions = {}
  let targetDir: string | null = null
  let i = startAt
  while (i < tokens.length) {
    const t = tokens[i]
    if (t === '--overwrite') { options.overwrite = true }
    else if (t === '--dry-run') { options.dryRun = true }
    else if (t === '--target' && tokens[i + 1]) { targetDir = unquote(tokens[i + 1]); i++ }
    i++
  }
  return { targetDir, options }
}

function parseArgs(args: string): Parsed {
  const trimmed = args.trim()
  if (!trimmed) return { cmd: 'browser' }

  const tokens = tokenize(trimmed)
  if (!tokens.length) return { cmd: 'browser' }

  // skill subcommands
  if (tokens[0] === 'skill') {
    const sub = tokens[1]
    if (!sub || sub === 'list') return { cmd: 'skill-list' }
    if (sub === 'remove' && tokens[2]) return { cmd: 'skill-remove', skillName: tokens[2] }
    if (sub === 'save' && tokens[2]) {
      const { path } = consumePath(tokens, 3)
      return path ? { cmd: 'skill-save', skillName: tokens[2], sourcePath: path } : { cmd: 'help' }
    }
    if (sub === 'use' && tokens[2]) {
      // find flags starting after the skill name
      let flagStart = 3
      while (flagStart < tokens.length && !tokens[flagStart].startsWith('--')) flagStart++
      const { targetDir, options } = parseFlags(tokens, flagStart)
      return { cmd: 'skill-use', skillName: tokens[2], targetDir, options }
    }
    return { cmd: 'help' }
  }

  // regular import: source = everything before first --flag
  const { path: sourcePath, nextIdx } = consumePath(tokens, 0)
  if (!sourcePath) return { cmd: 'browser' }
  const { targetDir, options } = parseFlags(tokens, nextIdx)
  return { cmd: 'import', sourcePath, targetDir, options }
}

// ── Command runner ────────────────────────────────────────────────────────────

async function runImportCommand(
  onDone: LocalJSXCommandOnDone,
  args: string,
): Promise<React.ReactNode> {
  const normalized = args.trim().toLowerCase()
  if (COMMON_HELP_ARGS.includes(normalized) || COMMON_INFO_ARGS.includes(normalized)) {
    onDone(renderHelp(), { display: 'system' })
    return null
  }

  const cwd = getCwd()
  const parsed = parseArgs(args)

  // ── browser ───────────────────────────────────────────────────────────────
  if (parsed.cmd === 'browser') {
    const startPath = homedir()
    return <FileBrowser onDone={onDone} startPath={startPath} targetDir={cwd} />
  }

  if (parsed.cmd === 'help') {
    onDone(renderHelp(), { display: 'system' })
    return null
  }

  // ── skill list ────────────────────────────────────────────────────────────
  if (parsed.cmd === 'skill-list') {
    const skills = listGlobalSkills()
    if (skills.length === 0) {
      onDone('No global skills saved yet.\n\nUse: /import skill save <name> <path>', { display: 'system' })
      return null
    }
    const lines = ['Global skills:', '']
    for (const s of skills) lines.push(`  ${s.name.padEnd(24)} ${s.path}`)
    onDone(lines.join('\n'), { display: 'system' })
    return null
  }

  // ── skill remove ──────────────────────────────────────────────────────────
  if (parsed.cmd === 'skill-remove') {
    const removed = removeGlobalSkill(parsed.skillName)
    onDone(
      removed
        ? `Skill "${parsed.skillName}" removed.`
        : `Skill "${parsed.skillName}" not found.\n\nRun /import skill list to see available skills.`,
      { display: 'system' },
    )
    return null
  }

  // ── skill save ────────────────────────────────────────────────────────────
  if (parsed.cmd === 'skill-save') {
    const resolved = resolveImportPath(parsed.sourcePath, cwd)
    saveGlobalSkill(parsed.skillName, resolved)
    onDone(`Skill "${parsed.skillName}" saved → ${resolved}`, { display: 'system' })
    return null
  }

  // ── skill use ─────────────────────────────────────────────────────────────
  if (parsed.cmd === 'skill-use') {
    const skill = findGlobalSkill(parsed.skillName)
    if (!skill) {
      onDone(
        `Skill "${parsed.skillName}" not found.\n\nRun /import skill list to see available skills.`,
        { display: 'system' },
      )
      return null
    }
    const target = parsed.targetDir
      ? resolveImportPath(parsed.targetDir, cwd)
      : join(cwd, basename(skill.path))
    try {
      const result = await importPath(skill.path, target, parsed.options)
      onDone(formatResult(result, skill.path, target), { display: 'system' })
    } catch (err) {
      onDone(`Error: ${err instanceof Error ? err.message : String(err)}`, { display: 'system' })
    }
    return null
  }

  // ── regular import ────────────────────────────────────────────────────────
  const resolvedSource = resolveImportPath(parsed.sourcePath, cwd)
  const resolvedTarget = parsed.targetDir
    ? resolveImportPath(parsed.targetDir, cwd)
    : join(cwd, basename(resolvedSource))

  try {
    const result = await importPath(resolvedSource, resolvedTarget, parsed.options)
    onDone(formatResult(result, resolvedSource, resolvedTarget), { display: 'system' })
  } catch (err) {
    onDone(`Error: ${err instanceof Error ? err.message : String(err)}`, { display: 'system' })
  }
  return null
}

// ── Entry point ───────────────────────────────────────────────────────────────

export const call: LocalJSXCommandCall = async (
  onDone,
  _context,
  args,
): Promise<React.ReactNode> => {
  // Note: Filesystem access is covered by first-run consent (FirstRunConsentDialog)
  // Users have already approved file system operations when they first launched NeoCode
  // See: docs/FIRST_RUN_CONSENT.md for details

  return runImportCommand(onDone, args ?? '')
}
