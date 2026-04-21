// E12.1 — Self-Improve Loop
//
// Post-session analysis: reviews session history, extracts patterns
// (repeated errors, frequent tools, code-quality trends), and writes
// improvement suggestions to project-memory and guidance files.
//
// Fires automatically when a session ends (if KAIROS config allows)
// or manually via `/self-improve`.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { logForDebugging } from '../../utils/debug.js'
import { loadKairosConfig } from '../kairos/config.js'
import { recordKairosMetric } from '../kairos/metrics.js'

// ─── Types ───────────────────────────────────────────────────────

export type SessionEvent = {
    type: 'tool_call' | 'error' | 'prompt' | 'response' | 'command'
    timestamp: string
    detail: string
    metadata?: Record<string, unknown>
}

export type ImprovementSuggestion = {
    category: 'error_pattern' | 'workflow' | 'performance' | 'memory' | 'prompt_quality'
    severity: 'info' | 'warning' | 'critical'
    title: string
    description: string
    actionable: string
    source: string
}

export type SessionAnalysis = {
    sessionId: string
    startedAt: string
    endedAt: string
    durationSec: number
    totalPrompts: number
    totalToolCalls: number
    totalErrors: number
    errorRate: number
    topTools: Array<{ name: string; count: number }>
    repeatedErrors: Array<{ message: string; count: number }>
    suggestions: ImprovementSuggestion[]
}

// ─── Session Collector ───────────────────────────────────────────

const sessionEvents: SessionEvent[] = []
let sessionStart: string | null = null
let sessionId: string | null = null

/** Call at session start to begin tracking. */
export function beginSessionTracking(id: string): void {
    sessionId = id
    sessionStart = new Date().toISOString()
    sessionEvents.length = 0
    logForDebugging('[self-improve] session tracking started')
}

/** Records a single event in the current session buffer. */
export function recordSessionEvent(event: Omit<SessionEvent, 'timestamp'>): void {
    sessionEvents.push({
        ...event,
        timestamp: new Date().toISOString(),
    })
}

// ─── Analysis Engine ─────────────────────────────────────────────

/** Runs the full post-session analysis pipeline. */
export async function runSelfImproveAnalysis(cwd: string): Promise<SessionAnalysis | null> {
    const config = loadKairosConfig(cwd)

    if (!config.selfImprove) {
        logForDebugging('[self-improve] disabled in kairos config')
        return null
    }

    const endedAt = new Date().toISOString()
    const startDate = sessionStart ? new Date(sessionStart) : new Date()
    const durationSec = Math.round((new Date(endedAt).getTime() - startDate.getTime()) / 1000)

    if (durationSec < config.selfImproveMinSessionSec) {
        logForDebugging(`[self-improve] session too short (${durationSec}s < ${config.selfImproveMinSessionSec}s)`)
        return null
    }

    logForDebugging('[self-improve] running post-session analysis…')

    const prompts = sessionEvents.filter(e => e.type === 'prompt')
    const toolCalls = sessionEvents.filter(e => e.type === 'tool_call')
    const errors = sessionEvents.filter(e => e.type === 'error')

    // Top tools by usage count
    const toolCounts = new Map<string, number>()
    for (const tc of toolCalls) {
        const name = tc.detail
        toolCounts.set(name, (toolCounts.get(name) ?? 0) + 1)
    }
    const topTools = [...toolCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

    // Repeated errors
    const errorCounts = new Map<string, number>()
    for (const err of errors) {
        const msg = err.detail.slice(0, 200) // truncate for grouping
        errorCounts.set(msg, (errorCounts.get(msg) ?? 0) + 1)
    }
    const repeatedErrors = [...errorCounts.entries()]
        .filter(([, count]) => count >= 2)
        .map(([message, count]) => ({ message, count }))
        .sort((a, b) => b.count - a.count)

    // Generate suggestions
    const suggestions = generateSuggestions({
        prompts: prompts.length,
        toolCalls: toolCalls.length,
        errors: errors.length,
        topTools,
        repeatedErrors,
        durationSec,
    })

    const analysis: SessionAnalysis = {
        sessionId: sessionId ?? 'unknown',
        startedAt: sessionStart ?? endedAt,
        endedAt,
        durationSec,
        totalPrompts: prompts.length,
        totalToolCalls: toolCalls.length,
        totalErrors: errors.length,
        errorRate: toolCalls.length > 0 ? errors.length / toolCalls.length : 0,
        topTools,
        repeatedErrors,
        suggestions,
    }

    // Persist analysis
    await persistAnalysis(analysis)

    // Append actionable suggestions to guidance file
    if (suggestions.length > 0) {
        await appendToGuidance(cwd, suggestions)
    }

    void recordKairosMetric({
        ts: new Date().toISOString(),
        event: 'self_improve',
        detail: `${suggestions.length} suggestions generated`,
    })

    logForDebugging(`[self-improve] analysis complete: ${suggestions.length} suggestions`)
    return analysis
}

// ─── Suggestion Generator ────────────────────────────────────────

type SuggestionInput = {
    prompts: number
    toolCalls: number
    errors: number
    topTools: Array<{ name: string; count: number }>
    repeatedErrors: Array<{ message: string; count: number }>
    durationSec: number
}

function generateSuggestions(input: SuggestionInput): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = []

    // High error rate
    if (input.toolCalls > 5 && input.errors / input.toolCalls > 0.3) {
        suggestions.push({
            category: 'error_pattern',
            severity: 'critical',
            title: 'High error rate detected',
            description: `${Math.round(input.errors / input.toolCalls * 100)}% of tool calls resulted in errors (${input.errors}/${input.toolCalls}).`,
            actionable: 'Review the most common error patterns and add preventive checks or fallbacks.',
            source: 'self-improve:error-rate',
        })
    }

    // Repeated errors (same error 3+ times)
    for (const err of input.repeatedErrors) {
        if (err.count >= 3) {
            suggestions.push({
                category: 'error_pattern',
                severity: 'warning',
                title: `Recurring error: "${err.message.slice(0, 60)}…"`,
                description: `This error occurred ${err.count} times in this session.`,
                actionable: 'Consider adding a gotcha or modifying the guidance to prevent this pattern.',
                source: 'self-improve:repeated-error',
            })
        }
    }

    // Heavy tool usage → possibly inefficient workflow
    const bashCalls = input.topTools.find(t => t.name === 'Bash' || t.name === 'PowerShell')
    if (bashCalls && bashCalls.count > 20) {
        suggestions.push({
            category: 'workflow',
            severity: 'info',
            title: 'Heavy shell usage detected',
            description: `${bashCalls.count} shell calls this session. Could scripting or task automation help?`,
            actionable: 'Consider creating a reusable script or MCP tool for common shell sequences.',
            source: 'self-improve:heavy-bash',
        })
    }

    // Very long session without many prompts
    if (input.durationSec > 1800 && input.prompts < 5) {
        suggestions.push({
            category: 'performance',
            severity: 'info',
            title: 'Long idle session detected',
            description: `Session lasted ${Math.round(input.durationSec / 60)} min but only ${input.prompts} prompts were sent.`,
            actionable: 'Consider using KAIROS scheduled tasks or BTW for background processing.',
            source: 'self-improve:idle-session',
        })
    }

    // Low prompt-to-tool ratio (potentially unclear prompts)
    if (input.prompts > 3 && input.toolCalls / input.prompts < 0.5) {
        suggestions.push({
            category: 'prompt_quality',
            severity: 'info',
            title: 'Low tool-call-per-prompt ratio',
            description: `Average ${(input.toolCalls / input.prompts).toFixed(1)} tool calls per prompt. Prompts may be too vague.`,
            actionable: 'Refine prompt specificity — include file paths, expected outcomes, and constraints.',
            source: 'self-improve:prompt-quality',
        })
    }

    return suggestions
}

// ─── Persistence ─────────────────────────────────────────────────

async function persistAnalysis(analysis: SessionAnalysis): Promise<void> {
    try {
        const dir = join(homedir(), '.neocode', 'self-improve')
        await mkdir(dir, { recursive: true })
        const filename = `session-${analysis.sessionId}-${Date.now()}.json`
        await writeFile(join(dir, filename), JSON.stringify(analysis, null, 2), 'utf8')
        logForDebugging(`[self-improve] analysis saved: ${filename}`)
    } catch (e: unknown) {
        logForDebugging(`[self-improve] persist failed: ${(e as Error).message}`)
    }
}

async function appendToGuidance(cwd: string, suggestions: ImprovementSuggestion[]): Promise<void> {
    const guidancePath = join(cwd, '.neocode', 'guidance.md')
    try {
        let existing = ''
        try {
            existing = await readFile(guidancePath, 'utf8')
        } catch {
            // File doesn't exist — we'll create it
        }

        const marker = '<!-- self-improve-suggestions -->'
        const ts = new Date().toISOString().slice(0, 10)
        const block = [
            '',
            marker,
            `## 🔄 Self-Improve Suggestions (${ts})`,
            '',
            ...suggestions.map(s => [
                `### ${severityIcon(s.severity)} ${s.title}`,
                `- **Category:** ${s.category}`,
                `- **Detail:** ${s.description}`,
                `- **Action:** ${s.actionable}`,
                '',
            ].join('\n')),
        ].join('\n')

        // If marker exists, replace old suggestions; otherwise append
        if (existing.includes(marker)) {
            const idx = existing.indexOf(marker)
            const content = existing.slice(0, idx) + block
            await mkdir(join(cwd, '.neocode'), { recursive: true })
            await writeFile(guidancePath, content, 'utf8')
        } else {
            await mkdir(join(cwd, '.neocode'), { recursive: true })
            await writeFile(guidancePath, existing + block, 'utf8')
        }

        logForDebugging('[self-improve] guidance file updated')
    } catch (e: unknown) {
        logForDebugging(`[self-improve] guidance update failed: ${(e as Error).message}`)
    }
}

function severityIcon(severity: string): string {
    switch (severity) {
        case 'critical': return '🔴'
        case 'warning': return '🟡'
        default: return '🔵'
    }
}
