#!/usr/bin/env bun
/**
 * NeoCode Standalone Binary Builder
 *
 * Generates platform-specific standalone executables that bundle Node.js runtime.
 * Supports multiple build strategies for maximum compatibility.
 *
 * Usage:
 *   bun run scripts/build-standalone.ts [options]
 *
 * Options:
 *   --all              Build for all platforms
 *   --windows          Build for Windows (x64)
 *   --linux            Build for Linux (x64)
 *   --macos            Build for macOS (x64 and arm64)
 *   --strategy <name>  Use specific build strategy (bun|pkg|caxa)
 *   --output <dir>     Output directory (default: ./bin-standalone)
 *
 * Strategies:
 *   - bun:  Uses Bun's experimental --compile flag (fastest, smallest)
 *   - pkg:  Uses @yao-pkg/pkg for Node.js bundling (most compatible)
 *   - caxa: Uses caxa for simple executable wrapper (fallback)
 */

import { existsSync, mkdirSync, rmSync, copyFileSync, chmodSync } from 'fs'
import { join, dirname, basename } from 'path'
import { execSync, spawn } from 'child_process'
import { readFileSync } from 'fs'

// ─── Configuration ───────────────────────────────────────────────────────────

interface BuildConfig {
  strategy: 'bun' | 'pkg' | 'caxa' | 'auto'
  platforms: Array<'windows' | 'linux' | 'macos'>
  outputDir: string
  verbose: boolean
}

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const version = pkg.version

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

function parseArgs(): BuildConfig {
  const args = process.argv.slice(2)
  const config: BuildConfig = {
    strategy: 'auto',
    platforms: [],
    outputDir: './bin-standalone',
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--all':
        config.platforms = ['windows', 'linux', 'macos']
        break
      case '--windows':
        config.platforms.push('windows')
        break
      case '--linux':
        config.platforms.push('linux')
        break
      case '--macos':
        config.platforms.push('macos')
        break
      case '--strategy':
        config.strategy = args[++i] as any
        break
      case '--output':
        config.outputDir = args[++i]
        break
      case '--verbose':
      case '-v':
        config.verbose = true
        break
      case '--help':
      case '-h':
        console.log(`
NeoCode Standalone Binary Builder v${version}

Usage: bun run scripts/build-standalone.ts [options]

Options:
  --all              Build for all platforms (Windows, Linux, macOS)
  --windows          Build for Windows x64
  --linux            Build for Linux x64
  --macos            Build for macOS (universal binary)
  --strategy <name>  Build strategy: bun, pkg, caxa, auto (default: auto)
  --output <dir>     Output directory (default: ./bin-standalone)
  --verbose, -v      Verbose output
  --help, -h         Show this help

Strategies:
  bun   - Bun's experimental compile (fastest, smallest, requires Bun)
  pkg   - @yao-pkg/pkg (most compatible, larger binaries)
  caxa  - Caxa wrapper (simple, portable archive)
  auto  - Automatically select best available strategy

Examples:
  bun run scripts/build-standalone.ts --all
  bun run scripts/build-standalone.ts --windows --linux
  bun run scripts/build-standalone.ts --strategy pkg --all
        `)
        process.exit(0)
    }
  }

  // Default to current platform if none specified
  if (config.platforms.length === 0) {
    const platform = process.platform
    if (platform === 'win32') config.platforms.push('windows')
    else if (platform === 'darwin') config.platforms.push('macos')
    else config.platforms.push('linux')
  }

  return config
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const prefix = {
    info: 'ℹ',
    success: '✓',
    error: '✗',
    warn: '⚠',
  }[level]
  console.log(`${prefix} ${message}`)
}

function execCommand(command: string, verbose: boolean = false): string {
  try {
    if (verbose) log(`Executing: ${command}`, 'info')
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: verbose ? 'inherit' : 'pipe',
    })
    return typeof output === 'string' ? output : ''
  } catch (error: any) {
    log(`Command failed: ${command}`, 'error')
    if (error.stdout) console.error(error.stdout)
    if (error.stderr) console.error(error.stderr)
    throw error
  }
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function cleanDir(dir: string) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ─── Strategy Detection ──────────────────────────────────────────────────────

function detectAvailableStrategy(): 'bun' | 'pkg' | 'caxa' {
  // IMPORTANT: Bun strategy doesn't work well with NeoCode because dist/cli.mjs
  // has external dependencies (AWS SDK, sharp, etc.) that can't be resolved
  // during --compile. PKG handles externals much better.

  // Check for @yao-pkg/pkg (PREFERRED for NeoCode)
  try {
    execSync('npx --yes --version', { encoding: 'utf-8', stdio: 'pipe' })
    log('Using @yao-pkg/pkg strategy (most compatible, recommended for NeoCode)', 'info')
    return 'pkg'
  } catch {}

  // Check for Bun with compile support (may fail with externals)
  try {
    const bunVersion = execSync('bun --version', { encoding: 'utf-8' }).trim()
    // Bun --compile is available in v1.0.0+
    if (parseFloat(bunVersion) >= 1.0) {
      log(`Detected Bun v${bunVersion} - WARNING: May fail with external dependencies`, 'warn')
      log('If build fails, use --strategy pkg explicitly', 'warn')
      return 'bun'
    }
  } catch {}

  // Fallback to caxa
  log('Using caxa strategy (fallback)', 'warn')
  return 'caxa'
}

// ─── Build Strategies ────────────────────────────────────────────────────────

/**
 * Strategy 1: Bun's experimental --compile flag
 * Pros: Fast, small binaries, native performance
 * Cons: Experimental, requires Bun to be installed
 */
async function buildWithBun(config: BuildConfig): Promise<void> {
  log('Building with Bun --compile...', 'info')

  // Ensure dist/cli.mjs exists
  if (!existsSync('./dist/cli.mjs')) {
    log('Running build first...', 'info')
    execCommand('bun run build', config.verbose)
  }

  ensureDir(config.outputDir)

  for (const platform of config.platforms) {
    const targets: Array<{ target: string; outputName: string }> = []

    if (platform === 'windows') {
      targets.push({ target: 'bun-windows-x64', outputName: 'neocode-windows-x64.exe' })
    } else if (platform === 'linux') {
      targets.push({ target: 'bun-linux-x64', outputName: 'neocode-linux-x64' })
    } else if (platform === 'macos') {
      targets.push(
        { target: 'bun-darwin-x64', outputName: 'neocode-macos-x64' },
        { target: 'bun-darwin-arm64', outputName: 'neocode-macos-arm64' }
      )
    }

    for (const { target, outputName } of targets) {
      const outputPath = join(config.outputDir, outputName)
      log(`Building ${outputName}...`, 'info')

      try {
        execCommand(
          `bun build ./dist/cli.mjs --compile --target=${target} --outfile="${outputPath}"`,
          config.verbose
        )
        log(`✓ Created ${outputName}`, 'success')
      } catch (error) {
        log(`Failed to build ${outputName}`, 'error')
        throw error
      }
    }
  }
}

/**
 * Strategy 2: @yao-pkg/pkg (fork of vercel/pkg with Node 20+ support)
 * Pros: Most compatible, works everywhere, mature
 * Cons: Larger binaries, slower startup
 */
async function buildWithPkg(config: BuildConfig): Promise<void> {
  log('Building with @yao-pkg/pkg...', 'info')

  // Ensure dist/cli.mjs exists
  if (!existsSync('./dist/cli.mjs')) {
    log('Running build first...', 'info')
    execCommand('bun run build', config.verbose)
  }

  ensureDir(config.outputDir)

  // Create pkg config
  const pkgConfig = {
    scripts: ['dist/cli.mjs'],
    assets: [],
    outputPath: config.outputDir,
    targets: [] as string[],
  }

  // Map platforms to pkg targets
  for (const platform of config.platforms) {
    if (platform === 'windows') {
      pkgConfig.targets.push('node20-win-x64')
    } else if (platform === 'linux') {
      pkgConfig.targets.push('node20-linux-x64')
    } else if (platform === 'macos') {
      pkgConfig.targets.push('node20-macos-x64', 'node20-macos-arm64')
    }
  }

  const targets = pkgConfig.targets.join(',')
  log(`Building for targets: ${targets}`, 'info')

  try {
    // Use @yao-pkg/pkg with npx
    execCommand(
      `npx --yes @yao-pkg/pkg dist/cli.mjs --targets ${targets} --output ${config.outputDir}/neocode`,
      config.verbose
    )
    log('✓ Built standalone binaries with pkg', 'success')
  } catch (error) {
    log('Failed to build with pkg', 'error')
    throw error
  }

  // Rename outputs to friendly names
  const renames: Record<string, string> = {
    'neocode.exe': 'neocode-windows-x64.exe',
    'neocode-win.exe': 'neocode-windows-x64.exe',
    'neocode': 'neocode-linux-x64',
    'neocode-linux': 'neocode-linux-x64',
    'neocode-macos': 'neocode-macos-x64',
    'neocode-macos-arm64': 'neocode-macos-arm64',
  }

  for (const [old, newName] of Object.entries(renames)) {
    const oldPath = join(config.outputDir, old)
    const newPath = join(config.outputDir, newName)
    if (existsSync(oldPath)) {
      try {
        if (existsSync(newPath)) rmSync(newPath)
        copyFileSync(oldPath, newPath)
        rmSync(oldPath)
        if (!newName.endsWith('.exe')) {
          chmodSync(newPath, 0o755)
        }
      } catch {}
    }
  }
}

/**
 * Strategy 3: Caxa (simple wrapper)
 * Pros: Simple, portable, works everywhere
 * Cons: Requires Node.js on target machine, slower
 */
async function buildWithCaxa(config: BuildConfig): Promise<void> {
  log('Building with caxa...', 'info')

  // Ensure dist/cli.mjs exists
  if (!existsSync('./dist/cli.mjs')) {
    log('Running build first...', 'info')
    execCommand('bun run build', config.verbose)
  }

  ensureDir(config.outputDir)

  for (const platform of config.platforms) {
    const extension = platform === 'windows' ? '.exe' : ''
    const outputName = `neocode-${platform}-x64${extension}`
    const outputPath = join(config.outputDir, outputName)

    log(`Building ${outputName}...`, 'info')

    try {
      execCommand(
        `npx --yes caxa --input . --output "${outputPath}" -- "{{caxa}}/node_modules/.bin/node" "{{caxa}}/dist/cli.mjs"`,
        config.verbose
      )
      log(`✓ Created ${outputName}`, 'success')
    } catch (error) {
      log(`Failed to build ${outputName}`, 'error')
      throw error
    }
  }
}

// ─── Main Build Function ─────────────────────────────────────────────────────

async function build() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  NeoCode Standalone Binary Builder v${version.padEnd(20)}║
╚═══════════════════════════════════════════════════════════╝
`)

  const config = parseArgs()

  log(`Platforms: ${config.platforms.join(', ')}`, 'info')
  log(`Strategy: ${config.strategy}`, 'info')
  log(`Output: ${config.outputDir}`, 'info')

  // Auto-detect strategy if needed
  const strategy = config.strategy === 'auto' ? detectAvailableStrategy() : config.strategy

  // Clean output directory
  log('Cleaning output directory...', 'info')
  cleanDir(config.outputDir)
  ensureDir(config.outputDir)

  // Execute build strategy
  const startTime = Date.now()

  try {
    switch (strategy) {
      case 'bun':
        await buildWithBun(config)
        break
      case 'pkg':
        await buildWithPkg(config)
        break
      case 'caxa':
        await buildWithCaxa(config)
        break
      default:
        throw new Error(`Unknown strategy: ${strategy}`)
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  ✓ Build completed successfully in ${duration}s          ║
╚═══════════════════════════════════════════════════════════╝

Standalone binaries created in: ${config.outputDir}/

You can now distribute these executables without requiring
Node.js or Bun to be installed on the target machine.
`)

    // Show file sizes (cross-platform)
    log('\nGenerated files:', 'info')
    try {
      const fs = require('fs')
      const path = require('path')
      const files = fs.readdirSync(config.outputDir)

      for (const file of files) {
        const filePath = path.join(config.outputDir, file)
        const stats = fs.statSync(filePath)
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
        console.log(`  ${file.padEnd(35)} ${sizeMB.padStart(8)} MB`)
      }
    } catch (err) {
      // Silently ignore if we can't list files
    }

  } catch (error) {
    log('Build failed!', 'error')
    console.error(error)
    process.exit(1)
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

build().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
