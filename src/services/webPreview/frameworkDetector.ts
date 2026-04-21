/**
 * Framework detector for Web Preview feature.
 * Reads package.json to identify the framework and the correct dev command.
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export type FrameworkKind =
  | 'nextjs'
  | 'vite'
  | 'react-cra'
  | 'astro'
  | 'remix'
  | 'sveltekit'
  | 'nuxt'
  | 'vue-cli'
  | 'angular'
  | 'parcel'
  | 'unknown'

export type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm'

export interface FrameworkInfo {
  kind: FrameworkKind
  name: string
  /** The dev command to run (e.g., "npm run dev") */
  devCommand: string
  /** Default port for this framework */
  defaultPort: number
  /** Environment variable that overrides the port (if framework supports it) */
  portEnvVar?: string
}

interface PackageJson {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

function readPackageJson(cwd: string): PackageJson | null {
  const pkgPath = join(cwd, 'package.json')
  if (!existsSync(pkgPath)) return null
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson
  } catch {
    return null
  }
}

function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(join(cwd, 'bun.lockb')) || existsSync(join(cwd, 'bun.lock'))) return 'bun'
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

function buildDevCommand(pm: PackageManager, scriptName: string): string {
  switch (pm) {
    case 'bun':
      return `bun run ${scriptName}`
    case 'pnpm':
      return `pnpm run ${scriptName}`
    case 'yarn':
      return `yarn ${scriptName}`
    default:
      return `npm run ${scriptName}`
  }
}

function hasDep(pkg: PackageJson, name: string): boolean {
  return !!(pkg.dependencies?.[name] || pkg.devDependencies?.[name])
}

function hasScript(pkg: PackageJson, name: string): boolean {
  return !!pkg.scripts?.[name]
}

/**
 * Detects the web framework used in `cwd` and returns the appropriate dev command.
 */
export function detectFramework(cwd: string): FrameworkInfo {
  const pkg = readPackageJson(cwd)
  const pm = detectPackageManager(cwd)

  // Prefer the explicit "dev" script when present — framework detection below
  // is used only to set sensible defaults for port/portEnvVar.
  const devScript = pkg?.scripts?.dev ? 'dev' : pkg?.scripts?.start ? 'start' : null

  if (!pkg) {
    return {
      kind: 'unknown',
      name: 'Unknown',
      devCommand: 'npm run dev',
      defaultPort: 3000,
    }
  }

  // Next.js
  if (hasDep(pkg, 'next')) {
    return {
      kind: 'nextjs',
      name: 'Next.js',
      devCommand: buildDevCommand(pm, devScript ?? 'dev'),
      defaultPort: 3000,
      portEnvVar: 'PORT',
    }
  }

  // Astro
  if (hasDep(pkg, 'astro')) {
    return {
      kind: 'astro',
      name: 'Astro',
      devCommand: buildDevCommand(pm, devScript ?? 'dev'),
      defaultPort: 4321,
      portEnvVar: 'PORT',
    }
  }

  // Remix
  if (hasDep(pkg, '@remix-run/react') || hasDep(pkg, '@remix-run/node')) {
    return {
      kind: 'remix',
      name: 'Remix',
      devCommand: buildDevCommand(pm, devScript ?? 'dev'),
      defaultPort: 3000,
      portEnvVar: 'PORT',
    }
  }

  // SvelteKit
  if (hasDep(pkg, '@sveltejs/kit')) {
    return {
      kind: 'sveltekit',
      name: 'SvelteKit',
      devCommand: buildDevCommand(pm, devScript ?? 'dev'),
      defaultPort: 5173,
      portEnvVar: 'PORT',
    }
  }

  // Nuxt
  if (hasDep(pkg, 'nuxt') || hasDep(pkg, 'nuxt3')) {
    return {
      kind: 'nuxt',
      name: 'Nuxt',
      devCommand: buildDevCommand(pm, devScript ?? 'dev'),
      defaultPort: 3000,
      portEnvVar: 'PORT',
    }
  }

  // Vite (covers plain React/Vue/Svelte with Vite)
  if (hasDep(pkg, 'vite')) {
    return {
      kind: 'vite',
      name: 'Vite',
      devCommand: buildDevCommand(pm, devScript ?? 'dev'),
      defaultPort: 5173,
      portEnvVar: 'VITE_PORT',
    }
  }

  // Create React App
  if (hasDep(pkg, 'react-scripts')) {
    return {
      kind: 'react-cra',
      name: 'Create React App',
      devCommand: buildDevCommand(pm, devScript ?? 'start'),
      defaultPort: 3000,
      portEnvVar: 'PORT',
    }
  }

  // Vue CLI
  if (hasDep(pkg, '@vue/cli-service')) {
    return {
      kind: 'vue-cli',
      name: 'Vue CLI',
      devCommand: buildDevCommand(pm, devScript ?? 'serve'),
      defaultPort: 8080,
      portEnvVar: 'PORT',
    }
  }

  // Angular CLI
  if (hasDep(pkg, '@angular/core')) {
    return {
      kind: 'angular',
      name: 'Angular',
      devCommand: buildDevCommand(pm, devScript ?? 'start'),
      defaultPort: 4200,
      portEnvVar: 'PORT',
    }
  }

  // Parcel
  if (hasDep(pkg, 'parcel')) {
    return {
      kind: 'parcel',
      name: 'Parcel',
      devCommand: buildDevCommand(pm, devScript ?? 'start'),
      defaultPort: 1234,
    }
  }

  // Fallback: use whatever dev/start script is present
  const script = devScript ?? 'dev'
  return {
    kind: 'unknown',
    name: 'Web project',
    devCommand: buildDevCommand(pm, script),
    defaultPort: 3000,
    portEnvVar: 'PORT',
  }
}
