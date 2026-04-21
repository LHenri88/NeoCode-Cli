// E15.3 — Performance Profiling
//
// Lightweight performance tracker for NeoCode CLI.
// Measures startup time, tool execution latency, memory usage,
// and provider response times. Outputs report to console or file.

import { logForDebugging } from '../../utils/debug.js'

// ─── Types ───────────────────────────────────────────────────────

export type PerfMark = {
    label: string
    startMs: number
    endMs?: number
    durationMs?: number
    memoryMB?: number
}

export type PerfReport = {
    timestamp: string
    marks: PerfMark[]
    summary: {
        totalStartupMs: number
        avgToolLatencyMs: number
        peakMemoryMB: number
        providerLatencyMs: number
        marksCount: number
    }
}

// ─── Profiler ────────────────────────────────────────────────────

const marks: PerfMark[] = []
let startupMark: PerfMark | null = null

/** Marks the beginning of a profiled section. */
export function perfStart(label: string): void {
    const mark: PerfMark = {
        label,
        startMs: performance.now(),
        memoryMB: getCurrentMemoryMB(),
    }
    marks.push(mark)

    if (label === 'startup') {
        startupMark = mark
    }
}

/** Marks the end of a profiled section. Returns duration in ms. */
export function perfEnd(label: string): number {
    let mark: PerfMark | undefined
    for (let i = marks.length - 1; i >= 0; i--) {
        if (marks[i]!.label === label && !marks[i]!.endMs) {
            mark = marks[i]
            break
        }
    }
    if (!mark) {
        logForDebugging(`[perf] no open mark for: ${label}`)
        return 0
    }

    mark.endMs = performance.now()
    mark.durationMs = mark.endMs - mark.startMs
    mark.memoryMB = getCurrentMemoryMB()

    return mark.durationMs
}

/** Quick one-shot measurement. */
export async function perfMeasure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    perfStart(label)
    try {
        return await fn()
    } finally {
        perfEnd(label)
    }
}

/** Generates a performance report. */
export function generatePerfReport(): PerfReport {
    const completedMarks = marks.filter(m => m.durationMs !== undefined)

    // Tool latencies
    const toolMarks = completedMarks.filter(m => m.label.startsWith('tool:'))
    const avgToolLatency = toolMarks.length > 0
        ? toolMarks.reduce((sum, m) => sum + (m.durationMs ?? 0), 0) / toolMarks.length
        : 0

    // Provider latency
    const providerMarks = completedMarks.filter(m => m.label.startsWith('provider:'))
    const avgProviderLatency = providerMarks.length > 0
        ? providerMarks.reduce((sum, m) => sum + (m.durationMs ?? 0), 0) / providerMarks.length
        : 0

    // Peak memory
    const peakMemory = Math.max(...completedMarks.map(m => m.memoryMB ?? 0), 0)

    // Startup time
    const startupMs = startupMark?.durationMs ?? 0

    return {
        timestamp: new Date().toISOString(),
        marks: completedMarks,
        summary: {
            totalStartupMs: Math.round(startupMs),
            avgToolLatencyMs: Math.round(avgToolLatency),
            peakMemoryMB: Math.round(peakMemory),
            providerLatencyMs: Math.round(avgProviderLatency),
            marksCount: completedMarks.length,
        },
    }
}

/** Formats the performance report for console output. */
export function formatPerfReport(report: PerfReport): string {
    const lines: string[] = [
        '╔══════════════════════════════════════════╗',
        '║      ⚡ NeoCode Performance Report       ║',
        '╠══════════════════════════════════════════╣',
        `║  Startup:     ${pad(report.summary.totalStartupMs + 'ms', 8)} ${indicator(report.summary.totalStartupMs, 2000)}             ║`,
        `║  Avg Tool:    ${pad(report.summary.avgToolLatencyMs + 'ms', 8)}                    ║`,
        `║  Provider:    ${pad(report.summary.providerLatencyMs + 'ms', 8)} ${indicator(report.summary.providerLatencyMs, 500)}             ║`,
        `║  Peak Memory: ${pad(report.summary.peakMemoryMB + 'MB', 8)} ${indicator(report.summary.peakMemoryMB, 300, true)}             ║`,
        `║  Total Marks: ${pad(String(report.summary.marksCount), 8)}                    ║`,
        '╠══════════════════════════════════════════╣',
    ]

    // Top 10 slowest
    const sorted = [...report.marks].sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))
    lines.push('║  Top 10 Slowest:                         ║')
    for (const mark of sorted.slice(0, 10)) {
        const dur = pad((mark.durationMs ?? 0).toFixed(0) + 'ms', 8)
        const lbl = mark.label.slice(0, 25).padEnd(25)
        lines.push(`║  ${dur} ${lbl}   ║`)
    }

    lines.push('╚══════════════════════════════════════════╝')
    return lines.join('\n')
}

/** Clears all performance marks. */
export function clearPerfMarks(): void {
    marks.length = 0
    startupMark = null
}

// ─── Helpers ─────────────────────────────────────────────────────

function getCurrentMemoryMB(): number {
    try {
        const usage = process.memoryUsage()
        return Math.round(usage.heapUsed / 1024 / 1024)
    } catch {
        return 0
    }
}

function pad(str: string, len: number): string {
    return str.padEnd(len)
}

function indicator(value: number, threshold: number, isMemory = false): string {
    if (isMemory) {
        return value <= threshold ? '✅' : '⚠️'
    }
    return value <= threshold ? '✅' : '⚠️'
}
