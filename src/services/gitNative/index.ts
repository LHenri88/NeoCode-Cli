// E13.3 — Git-native Integration (autocommit)
//
// Provides automatic git commit functionality for NeoCode sessions.
// After tool executions that modify files, generates meaningful commit
// messages and optionally auto-commits changes.

import { execFile } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { logForDebugging } from '../../utils/debug.js'

const execFileAsync = promisify(execFile)

// ─── Types ───────────────────────────────────────────────────────

export type AutocommitConfig = {
    enabled: boolean
    /** Commit after each tool_call vs batch at session end */
    mode: 'per-action' | 'session-end' | 'manual'
    /** Prefix for auto-generated commit messages */
    prefix: string
    /** Files/patterns to exclude from autocommit */
    excludePatterns: string[]
    /** Max number of files per commit (split into multiple if exceeded) */
    maxFilesPerCommit: number
    /** Sign commits with GPG if configured */
    signCommits: boolean
}

export type CommitResult = {
    success: boolean
    hash?: string
    message?: string
    filesChanged: number
    error?: string
}

export type GitStatus = {
    isRepo: boolean
    branch: string
    modified: string[]
    staged: string[]
    untracked: string[]
    ahead: number
    behind: number
}

// ─── Default Config ──────────────────────────────────────────────

export const AUTOCOMMIT_DEFAULTS: AutocommitConfig = {
    enabled: false,
    mode: 'session-end',
    prefix: '🤖 neocode:',
    excludePatterns: ['.neocode/', 'node_modules/', '.env', '*.log'],
    maxFilesPerCommit: 50,
    signCommits: false,
}

// ─── Config Loading ──────────────────────────────────────────────

export async function loadAutocommitConfig(cwd: string): Promise<AutocommitConfig> {
    try {
        const configPath = join(cwd, '.neocode', 'autocommit.json')
        const raw = await readFile(configPath, 'utf8')
        const parsed = JSON.parse(raw) as Partial<AutocommitConfig>
        return { ...AUTOCOMMIT_DEFAULTS, ...parsed }
    } catch {
        return { ...AUTOCOMMIT_DEFAULTS }
    }
}

// ─── Git Operations ──────────────────────────────────────────────

/** Checks if the directory is a git repository. */
export async function isGitRepo(cwd: string): Promise<boolean> {
    try {
        await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd })
        return true
    } catch {
        return false
    }
}

/** Gets the current git status. */
export async function getGitStatus(cwd: string): Promise<GitStatus> {
    const status: GitStatus = {
        isRepo: false,
        branch: '',
        modified: [],
        staged: [],
        untracked: [],
        ahead: 0,
        behind: 0,
    }

    if (!(await isGitRepo(cwd))) return status
    status.isRepo = true

    try {
        // Branch
        const { stdout: branch } = await execFileAsync(
            'git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd },
        )
        status.branch = branch.trim()

        // Porcelain status
        const { stdout: porcelain } = await execFileAsync(
            'git', ['status', '--porcelain', '-uall'], { cwd },
        )
        for (const line of porcelain.split('\n').filter(Boolean)) {
            const xy = line.slice(0, 2)
            const file = line.slice(3).trim()
            if (xy[0] !== ' ' && xy[0] !== '?') status.staged.push(file)
            if (xy[1] === 'M' || xy[1] === 'D') status.modified.push(file)
            if (xy === '??') status.untracked.push(file)
        }

        // Ahead/behind
        try {
            const { stdout: ab } = await execFileAsync(
                'git', ['rev-list', '--left-right', '--count', `HEAD...@{upstream}`], { cwd },
            )
            const [ahead, behind] = ab.trim().split(/\s+/).map(Number)
            status.ahead = ahead ?? 0
            status.behind = behind ?? 0
        } catch {
            // No upstream configured
        }
    } catch (e: unknown) {
        logForDebugging(`[git-native] status error: ${(e as Error).message}`)
    }

    return status
}

/** Stages files and creates a commit. */
export async function autocommit(
    cwd: string,
    message: string,
    files?: string[],
): Promise<CommitResult> {
    const config = await loadAutocommitConfig(cwd)

    if (!config.enabled) {
        return { success: false, filesChanged: 0, error: 'autocommit disabled' }
    }

    if (!(await isGitRepo(cwd))) {
        return { success: false, filesChanged: 0, error: 'not a git repository' }
    }

    try {
        // Stage files
        if (files && files.length > 0) {
            // Stage specific files
            const batches = chunk(files, config.maxFilesPerCommit)
            for (const batch of batches) {
                await execFileAsync('git', ['add', '--', ...batch], { cwd })
            }
        } else {
            // Stage all modified/new files (respecting excludes)
            await execFileAsync('git', ['add', '-A'], { cwd })

            // Unstage excluded patterns
            for (const pattern of config.excludePatterns) {
                try {
                    await execFileAsync('git', ['reset', 'HEAD', '--', pattern], { cwd })
                } catch {
                    // Pattern may not match anything — that's fine
                }
            }
        }

        // Check if there's anything staged
        const { stdout: diff } = await execFileAsync(
            'git', ['diff', '--cached', '--name-only'], { cwd },
        )
        const stagedFiles = diff.split('\n').filter(Boolean)
        if (stagedFiles.length === 0) {
            return { success: false, filesChanged: 0, error: 'nothing to commit' }
        }

        // Commit
        const commitMsg = `${config.prefix} ${message}`
        const commitArgs = ['commit', '-m', commitMsg]
        if (config.signCommits) commitArgs.push('-S')

        await execFileAsync('git', commitArgs, { cwd })

        // Get the commit hash
        const { stdout: hash } = await execFileAsync(
            'git', ['rev-parse', '--short', 'HEAD'], { cwd },
        )

        logForDebugging(`[git-native] committed ${stagedFiles.length} file(s): ${hash.trim()}`)

        return {
            success: true,
            hash: hash.trim(),
            message: commitMsg,
            filesChanged: stagedFiles.length,
        }
    } catch (e: unknown) {
        const err = (e as Error).message
        logForDebugging(`[git-native] commit failed: ${err}`)
        return { success: false, filesChanged: 0, error: err }
    }
}

/** Creates a session-end summary commit with all changes. */
export async function commitSessionChanges(
    cwd: string,
    sessionSummary: string,
): Promise<CommitResult> {
    return autocommit(cwd, sessionSummary)
}

/** Returns the last N commit messages (for context in prompts). */
export async function getRecentCommits(cwd: string, count = 5): Promise<string[]> {
    try {
        const { stdout } = await execFileAsync(
            'git', ['log', `--format=%h %s`, `-n`, String(count)], { cwd },
        )
        return stdout.split('\n').filter(Boolean)
    } catch {
        return []
    }
}

// ─── Helpers ─────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
    const result: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size))
    }
    return result
}
