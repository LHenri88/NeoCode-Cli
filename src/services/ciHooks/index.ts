// E13.4 — CI/CD Hooks
//
// Lifecycle hooks that execute custom scripts at key NeoCode events.
// Supports pre/post hooks for session, commit, build, and test events.
// Hooks are configured in .neocode/hooks.yaml.

import { readFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { parse as parseYaml } from 'yaml'
import { logForDebugging } from '../../utils/debug.js'

const execFileAsync = promisify(execFile)

// ─── Types ───────────────────────────────────────────────────────

export type HookEvent =
    | 'pre-session'
    | 'post-session'
    | 'pre-commit'
    | 'post-commit'
    | 'pre-build'
    | 'post-build'
    | 'pre-test'
    | 'post-test'
    | 'on-error'
    | 'on-tool-call'

export type HookDefinition = {
    /** Shell command to execute */
    command: string
    /** Timeout in seconds (default: 30) */
    timeout?: number
    /** Continue on failure (default: false for pre-hooks, true for post-hooks) */
    continueOnError?: boolean
    /** Environment variable overrides */
    env?: Record<string, string>
    /** Run only when this condition is truthy (env var name) */
    condition?: string
    /** Human-readable description */
    description?: string
}

export type HooksConfig = {
    enabled: boolean
    hooks: Partial<Record<HookEvent, HookDefinition[]>>
}

export type HookResult = {
    event: HookEvent
    command: string
    success: boolean
    stdout: string
    stderr: string
    duration: number
    error?: string
}

// ─── Config ──────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_SEC = 30

export function loadHooksConfig(cwd: string): HooksConfig {
    const candidates = [
        join(cwd, '.neocode', 'hooks.yaml'),
        join(cwd, '.neocode', 'hooks.yml'),
    ]

    for (const path of candidates) {
        try {
            const raw = readFileSync(path, 'utf8')
            const parsed = parseYaml(raw)
            if (!parsed || typeof parsed !== 'object') continue
            logForDebugging(`[ci-hooks] config loaded from ${path}`)
            return {
                enabled: (parsed as { enabled?: boolean }).enabled !== false,
                hooks: (parsed as { hooks?: HooksConfig['hooks'] }).hooks ?? {},
            }
        } catch {
            // Not found or parse error — try next
        }
    }

    return { enabled: false, hooks: {} }
}

// ─── Hook Execution ──────────────────────────────────────────────

/** Runs all hooks for a given event. Returns results for each. */
export async function executeHooks(
    cwd: string,
    event: HookEvent,
    context?: Record<string, string>,
): Promise<HookResult[]> {
    const config = loadHooksConfig(cwd)

    if (!config.enabled) {
        logForDebugging(`[ci-hooks] hooks disabled`)
        return []
    }

    const definitions = config.hooks[event]
    if (!definitions || definitions.length === 0) {
        logForDebugging(`[ci-hooks] no hooks for event: ${event}`)
        return []
    }

    const results: HookResult[] = []

    for (const def of definitions) {
        // Check condition
        if (def.condition && !process.env[def.condition]) {
            logForDebugging(`[ci-hooks] skipping ${event} hook — condition ${def.condition} not met`)
            continue
        }

        const result = await executeOneHook(cwd, event, def, context)
        results.push(result)

        // For pre-hooks, stop on failure unless continueOnError
        const isPre = event.startsWith('pre-')
        const shouldStop = !result.success && !(def.continueOnError ?? !isPre)
        if (shouldStop) {
            logForDebugging(`[ci-hooks] ${event} hook failed — stopping pipeline`)
            break
        }
    }

    return results
}

async function executeOneHook(
    cwd: string,
    event: HookEvent,
    def: HookDefinition,
    context?: Record<string, string>,
): Promise<HookResult> {
    const start = Date.now()
    const timeoutMs = (def.timeout ?? DEFAULT_TIMEOUT_SEC) * 1000

    // Build environment
    const env: Record<string, string> = {
        ...process.env as Record<string, string>,
        NEOCODE_HOOK_EVENT: event,
        NEOCODE_VERSION: process.env['NEOCODE_VERSION'] ?? '0.1.8',
        ...(context ?? {}),
        ...(def.env ?? {}),
    }

    logForDebugging(`[ci-hooks] running ${event}: ${def.command}`)

    try {
        const shell = process.platform === 'win32' ? 'powershell' : 'bash'
        const shellArg = process.platform === 'win32' ? '-Command' : '-c'

        const { stdout, stderr } = await execFileAsync(shell, [shellArg, def.command], {
            cwd,
            timeout: timeoutMs,
            env,
        })

        const duration = Date.now() - start
        logForDebugging(`[ci-hooks] ${event} completed in ${duration}ms`)

        return {
            event,
            command: def.command,
            success: true,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            duration,
        }
    } catch (e: unknown) {
        const duration = Date.now() - start
        const err = e as { stdout?: string; stderr?: string; message?: string }

        logForDebugging(`[ci-hooks] ${event} failed: ${err.message}`)

        return {
            event,
            command: def.command,
            success: false,
            stdout: (err.stdout ?? '').trim(),
            stderr: (err.stderr ?? '').trim(),
            duration,
            error: err.message,
        }
    }
}

// ─── Convenience Functions ───────────────────────────────────────

export async function runPreSessionHooks(cwd: string): Promise<HookResult[]> {
    return executeHooks(cwd, 'pre-session')
}

export async function runPostSessionHooks(cwd: string): Promise<HookResult[]> {
    return executeHooks(cwd, 'post-session')
}

export async function runPreCommitHooks(cwd: string, context?: Record<string, string>): Promise<HookResult[]> {
    return executeHooks(cwd, 'pre-commit', context)
}

export async function runPostCommitHooks(cwd: string, context?: Record<string, string>): Promise<HookResult[]> {
    return executeHooks(cwd, 'post-commit', context)
}

export async function runOnErrorHooks(cwd: string, errorContext: Record<string, string>): Promise<HookResult[]> {
    return executeHooks(cwd, 'on-error', errorContext)
}
