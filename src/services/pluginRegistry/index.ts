// E13.2 — Plugin Registry / Marketplace Structure
//
// Provides a registry for discovering, listing, and fetching plugin metadata
// from a local JSON-based manifest. This is the foundation for a future
// online marketplace.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { logForDebugging } from '../../utils/debug.js'

// ─── Types ───────────────────────────────────────────────────────

export type PluginManifest = {
    name: string
    version: string
    description: string
    author: string
    license: string
    repository?: string
    homepage?: string
    keywords: string[]
    /** Entry point relative to plugin root */
    main: string
    /** Plugin capabilities */
    provides: PluginCapability[]
    /** Minimum NeoCode version */
    minNeoCodeVersion?: string
    /** Whether this plugin is official or community */
    tier: 'official' | 'community' | 'experimental'
}

export type PluginCapability = 'mcp-server' | 'skill' | 'hook' | 'theme' | 'tool' | 'command'

export type RegistryEntry = {
    manifest: PluginManifest
    installedAt: string
    updatedAt: string
    enabled: boolean
    source: 'local' | 'registry' | 'git'
    path?: string
}

export type PluginRegistry = {
    version: number
    plugins: Record<string, RegistryEntry>
}

// ─── Registry Manager ────────────────────────────────────────────

const REGISTRY_FILE = 'plugin-registry.json'

function getRegistryPath(): string {
    return join(homedir(), '.neocode', REGISTRY_FILE)
}

/** Loads the plugin registry from disk. Returns empty registry if not found. */
export async function loadRegistry(): Promise<PluginRegistry> {
    try {
        const raw = await readFile(getRegistryPath(), 'utf8')
        return JSON.parse(raw) as PluginRegistry
    } catch {
        return { version: 1, plugins: {} }
    }
}

/** Saves the plugin registry to disk. */
export async function saveRegistry(registry: PluginRegistry): Promise<void> {
    const dir = join(homedir(), '.neocode')
    await mkdir(dir, { recursive: true })
    await writeFile(getRegistryPath(), JSON.stringify(registry, null, 2), 'utf8')
    logForDebugging('[plugin-registry] saved')
}

/** Registers a plugin from a manifest. */
export async function registerPlugin(
    manifest: PluginManifest,
    source: RegistryEntry['source'],
    path?: string,
): Promise<void> {
    const registry = await loadRegistry()
    const now = new Date().toISOString()

    registry.plugins[manifest.name] = {
        manifest,
        installedAt: registry.plugins[manifest.name]?.installedAt ?? now,
        updatedAt: now,
        enabled: true,
        source,
        path,
    }

    await saveRegistry(registry)
    logForDebugging(`[plugin-registry] registered: ${manifest.name}@${manifest.version}`)
}

/** Unregisters a plugin by name. */
export async function unregisterPlugin(name: string): Promise<boolean> {
    const registry = await loadRegistry()
    if (!registry.plugins[name]) return false
    delete registry.plugins[name]
    await saveRegistry(registry)
    logForDebugging(`[plugin-registry] unregistered: ${name}`)
    return true
}

/** Toggles plugin enabled state. Returns new state. */
export async function togglePlugin(name: string): Promise<boolean | null> {
    const registry = await loadRegistry()
    const entry = registry.plugins[name]
    if (!entry) return null
    entry.enabled = !entry.enabled
    entry.updatedAt = new Date().toISOString()
    await saveRegistry(registry)
    logForDebugging(`[plugin-registry] ${name} → ${entry.enabled ? 'enabled' : 'disabled'}`)
    return entry.enabled
}

/** Lists all registered plugins matching optional filters. */
export async function listPlugins(opts?: {
    tier?: PluginManifest['tier']
    capability?: PluginCapability
    enabled?: boolean
}): Promise<RegistryEntry[]> {
    const registry = await loadRegistry()
    let entries = Object.values(registry.plugins)

    if (opts?.tier) {
        entries = entries.filter(e => e.manifest.tier === opts.tier)
    }
    if (opts?.capability) {
        entries = entries.filter(e => e.manifest.provides.includes(opts.capability!))
    }
    if (opts?.enabled !== undefined) {
        entries = entries.filter(e => e.enabled === opts.enabled)
    }

    return entries.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name))
}

/** Searches plugins by keyword in name, description, or keywords array. */
export async function searchPlugins(query: string): Promise<RegistryEntry[]> {
    const registry = await loadRegistry()
    const q = query.toLowerCase()
    return Object.values(registry.plugins).filter(e => {
        const m = e.manifest
        return (
            m.name.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            m.keywords.some(k => k.toLowerCase().includes(q))
        )
    })
}
