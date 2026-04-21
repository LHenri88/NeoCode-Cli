import { afterEach, describe, expect, mock, test } from 'bun:test'
import * as fsPromises from 'fs/promises'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { homedir, tmpdir } from 'os'
import { join } from 'path'

const originalEnv = { ...process.env }
const originalArgv = [...process.argv]

async function importFreshEnvUtils() {
  return import(`./envUtils.ts?ts=${Date.now()}-${Math.random()}`)
}

async function importFreshSettings() {
  return import(`./settings/settings.ts?ts=${Date.now()}-${Math.random()}`)
}

async function importFreshLocalInstaller() {
  return import(`./localInstaller.ts?ts=${Date.now()}-${Math.random()}`)
}

afterEach(() => {
  process.env = { ...originalEnv }
  process.argv = [...originalArgv]
  mock.restore()
})

describe('NeoCode paths', () => {
  test('defaults user config home to ~/.neocode', async () => {
    delete process.env.CLAUDE_CONFIG_DIR
    const { resolveClaudeConfigHomeDir } = await importFreshEnvUtils()

    expect(
      resolveClaudeConfigHomeDir({
        homeDir: homedir(),
        neocodeExists: true,
        legacyClaudeExists: false,
      }),
    ).toBe(join(homedir(), '.neocode'))
  })

  test('falls back to ~/.claude when legacy config exists and ~/.neocode does not', async () => {
    delete process.env.CLAUDE_CONFIG_DIR
    const { resolveClaudeConfigHomeDir } = await importFreshEnvUtils()

    expect(
      resolveClaudeConfigHomeDir({
        homeDir: homedir(),
        neocodeExists: false,
        legacyClaudeExists: true,
      }),
    ).toBe(join(homedir(), '.claude'))
  })

  test('migrates ~/.claude to ~/.neocode when enabled', async () => {
    const cwd = join(tmpdir(), `neocode-config-migration-${Date.now()}`)
    try {
      mkdirSync(join(cwd, '.claude'), { recursive: true })
      writeFileSync(join(cwd, '.claude', 'settings.json'), '{"theme":"dark"}')

      const { resolveClaudeConfigHomeDir } = await importFreshEnvUtils()

      expect(
        resolveClaudeConfigHomeDir({
          homeDir: cwd,
          migrateLegacy: true,
        }),
      ).toBe(join(cwd, '.neocode'))
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  })

  test('uses CLAUDE_CONFIG_DIR override when provided', async () => {
    process.env.CLAUDE_CONFIG_DIR = '/tmp/custom-neocode'
    const { getClaudeConfigHomeDir, resolveClaudeConfigHomeDir } =
      await importFreshEnvUtils()

    expect(getClaudeConfigHomeDir()).toBe('/tmp/custom-neocode')
    expect(
      resolveClaudeConfigHomeDir({
        configDirEnv: '/tmp/custom-neocode',
      }),
    ).toBe('/tmp/custom-neocode')
  })

  test('project and local settings paths use .neocode', async () => {
    const { getRelativeSettingsFilePathForSource } = await importFreshSettings()

    expect(getRelativeSettingsFilePathForSource('projectSettings')).toBe(
      '.neocode/settings.json',
    )
    expect(getRelativeSettingsFilePathForSource('localSettings')).toBe(
      '.neocode/settings.local.json',
    )
  })

  test('local installer uses neocode wrapper path', async () => {
    delete process.env.CLAUDE_CONFIG_DIR
    const { getLocalClaudePath } = await importFreshLocalInstaller()

    expect(getLocalClaudePath()).toBe(
      join(homedir(), '.neocode', 'local', 'neocode'),
    )
  })

  test('local installation detection matches .neocode path', async () => {
    const { isManagedLocalInstallationPath } =
      await importFreshLocalInstaller()

    expect(
      isManagedLocalInstallationPath(
        `${join(homedir(), '.neocode', 'local')}/node_modules/.bin/neocode`,
      ),
    ).toBe(true)
  })

  test('local installation detection still matches legacy .claude path', async () => {
    const { isManagedLocalInstallationPath } =
      await importFreshLocalInstaller()

    expect(
      isManagedLocalInstallationPath(
        `${join(homedir(), '.claude', 'local')}/node_modules/.bin/neocode`,
      ),
    ).toBe(true)
  })

  test('candidate local install dirs include both neocode and legacy claude paths', async () => {
    const { getCandidateLocalInstallDirs } = await importFreshLocalInstaller()

    expect(
      getCandidateLocalInstallDirs({
        configHomeDir: join(homedir(), '.neocode'),
        homeDir: homedir(),
      }),
    ).toEqual([
      join(homedir(), '.neocode', 'local'),
      join(homedir(), '.claude', 'local'),
    ])
  })

  test('legacy local installs are detected when they still expose the claude binary', async () => {
    mock.module('fs/promises', () => ({
      ...fsPromises,
      access: async (path: string) => {
        if (
          path === join(homedir(), '.claude', 'local', 'node_modules', '.bin', 'claude')
        ) {
          return
        }
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      },
    }))

    const { getDetectedLocalInstallDir, localInstallationExists } =
      await importFreshLocalInstaller()

    expect(await localInstallationExists()).toBe(true)
    expect(await getDetectedLocalInstallDir()).toBe(
      join(homedir(), '.claude', 'local'),
    )
  })
})
