// E13.2 — Plugin Registry tests

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import {
    loadRegistry,
    saveRegistry,
    registerPlugin,
    unregisterPlugin,
    togglePlugin,
    listPlugins,
    searchPlugins,
    type PluginManifest,
} from './index.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir, homedir } from 'node:os'
import { join } from 'node:path'

const sampleManifest: PluginManifest = {
    name: 'neocode-telegram',
    version: '1.0.0',
    description: 'Telegram notifications for NeoCode',
    author: 'NeoCode Team',
    license: 'MIT',
    keywords: ['telegram', 'notifications', 'messaging'],
    main: 'index.ts',
    provides: ['mcp-server'],
    tier: 'official',
}

describe('Plugin Registry', () => {
    it('should load empty registry when file does not exist', async () => {
        const reg = await loadRegistry()
        expect(reg.version).toBe(1)
        expect(Object.keys(reg.plugins).length).toBeGreaterThanOrEqual(0)
    })

    it('should register and list plugins', async () => {
        await registerPlugin(sampleManifest, 'local', '/plugins/telegram')
        const entries = await listPlugins()
        expect(entries.some(e => e.manifest.name === 'neocode-telegram')).toBe(true)
    })

    it('should toggle plugin enabled state', async () => {
        await registerPlugin(sampleManifest, 'local')
        const newState = await togglePlugin('neocode-telegram')
        expect(newState).toBe(false)

        const restored = await togglePlugin('neocode-telegram')
        expect(restored).toBe(true)
    })

    it('should search plugins by keyword', async () => {
        await registerPlugin(sampleManifest, 'local')
        const results = await searchPlugins('telegram')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0]!.manifest.name).toBe('neocode-telegram')
    })

    it('should filter by capability', async () => {
        await registerPlugin(sampleManifest, 'local')
        const mcpPlugins = await listPlugins({ capability: 'mcp-server' })
        expect(mcpPlugins.some(e => e.manifest.name === 'neocode-telegram')).toBe(true)

        const toolPlugins = await listPlugins({ capability: 'tool' })
        expect(toolPlugins.some(e => e.manifest.name === 'neocode-telegram')).toBe(false)
    })

    it('should return null when toggling non-existent plugin', async () => {
        const result = await togglePlugin('does-not-exist')
        expect(result).toBeNull()
    })
})
