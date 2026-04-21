// E12.1 — Self-Improve Loop tests

import { describe, it, expect, beforeEach } from 'bun:test'
import {
    beginSessionTracking,
    recordSessionEvent,
    runSelfImproveAnalysis,
    type SessionAnalysis,
} from './index.js'
import { join } from 'node:path'
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

describe('Self-Improve Loop', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await mkdtemp(join(tmpdir(), 'selfimprove-test-'))
        // Create .neocode dir with enabled kairos config
        await mkdir(join(tempDir, '.neocode'), { recursive: true })
        await writeFile(
            join(tempDir, '.neocode', 'kairos.yaml'),
            'enabled: true\nselfImprove: true\nselfImproveMinSessionSec: 0\n',
            'utf8',
        )
    })

    it('should track session events and generate analysis', async () => {
        beginSessionTracking('test-session-001')

        // Simulate a session
        recordSessionEvent({ type: 'prompt', detail: 'Fix the auth module' })
        recordSessionEvent({ type: 'tool_call', detail: 'Bash' })
        recordSessionEvent({ type: 'tool_call', detail: 'FileEdit' })
        recordSessionEvent({ type: 'tool_call', detail: 'Bash' })
        recordSessionEvent({ type: 'error', detail: 'Permission denied: /etc/hosts' })
        recordSessionEvent({ type: 'error', detail: 'Permission denied: /etc/hosts' })
        recordSessionEvent({ type: 'error', detail: 'Permission denied: /etc/hosts' })

        const analysis = await runSelfImproveAnalysis(tempDir)
        expect(analysis).not.toBeNull()
        expect(analysis!.sessionId).toBe('test-session-001')
        expect(analysis!.totalPrompts).toBe(1)
        expect(analysis!.totalToolCalls).toBe(3)
        expect(analysis!.totalErrors).toBe(3)
        expect(analysis!.topTools.length).toBeGreaterThan(0)
        expect(analysis!.topTools[0]!.name).toBe('Bash')
    })

    it('should detect repeated errors and generate suggestions', async () => {
        beginSessionTracking('test-session-002')

        recordSessionEvent({ type: 'prompt', detail: 'Deploy the app' })
        for (let i = 0; i < 10; i++) {
            recordSessionEvent({ type: 'tool_call', detail: 'Bash' })
            recordSessionEvent({ type: 'error', detail: 'ECONNREFUSED: localhost:3000' })
        }

        const analysis = await runSelfImproveAnalysis(tempDir)
        expect(analysis).not.toBeNull()
        expect(analysis!.repeatedErrors.length).toBeGreaterThan(0)
        expect(analysis!.suggestions.some(s => s.category === 'error_pattern')).toBe(true)
    })

    it('should return null when self-improve is disabled', async () => {
        await writeFile(
            join(tempDir, '.neocode', 'kairos.yaml'),
            'enabled: true\nselfImprove: false\n',
            'utf8',
        )
        beginSessionTracking('test-session-003')
        recordSessionEvent({ type: 'prompt', detail: 'test' })

        const analysis = await runSelfImproveAnalysis(tempDir)
        expect(analysis).toBeNull()
    })

    it('should append suggestions to guidance.md', async () => {
        beginSessionTracking('test-session-004')

        for (let i = 0; i < 20; i++) {
            recordSessionEvent({ type: 'tool_call', detail: 'Bash' })
            recordSessionEvent({ type: 'error', detail: 'File not found' })
        }
        recordSessionEvent({ type: 'prompt', detail: 'fix it' })

        await runSelfImproveAnalysis(tempDir)

        const guidancePath = join(tempDir, '.neocode', 'guidance.md')
        const content = await readFile(guidancePath, 'utf8')
        expect(content).toContain('Self-Improve Suggestions')
        expect(content).toContain('self-improve-suggestions')
    })
})
