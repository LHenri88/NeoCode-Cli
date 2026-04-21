import { getAllowedSettingSources } from '../../bootstrap/state.js'
import { t } from '../i18n.js'

/**
 * All possible sources where settings can come from
 * Order matters - later sources override earlier ones
 */
export const SETTING_SOURCES = [
  // User settings (global)
  'userSettings',

  // Project settings (shared per-directory)
  'projectSettings',

  // Local settings (gitignored)
  'localSettings',

  // Flag settings (from --settings flag)
  'flagSettings',

  // Policy settings (managed-settings.json or remote settings from API)
  'policySettings',
] as const

export type SettingSource = (typeof SETTING_SOURCES)[number]

export function getSettingSourceName(source: SettingSource): string {
  switch (source) {
    case 'userSettings':    return t('settingSource.user')
    case 'projectSettings': return t('settingSource.project')
    case 'localSettings':   return t('settingSource.local')
    case 'flagSettings':    return t('settingSource.flag')
    case 'policySettings':  return t('settingSource.managed')
  }
}

/**
 * Get short display name for a setting source (capitalized, for context/skills UI)
 * @param source The setting source or 'plugin'/'built-in'
 * @returns Short capitalized display name like 'User', 'Project', 'Plugin'
 */
export function getSourceDisplayName(
  source: SettingSource | 'plugin' | 'built-in',
): string {
  switch (source) {
    case 'userSettings':    return t('settingDisplayName.user')
    case 'projectSettings': return t('settingDisplayName.project')
    case 'localSettings':   return t('settingDisplayName.local')
    case 'flagSettings':    return t('settingDisplayName.flag')
    case 'policySettings':  return t('settingDisplayName.managed')
    case 'plugin':          return t('settingDisplayName.plugin')
    case 'built-in':        return t('settingDisplayName.builtin')
  }
}

/**
 * Get display name for a setting or permission rule source (lowercase, for inline use)
 * @param source The setting source or permission rule source
 * @returns Display name for the source in lowercase
 */
export function getSettingSourceDisplayNameLowercase(
  source: SettingSource | 'cliArg' | 'command' | 'session',
): string {
  switch (source) {
    case 'userSettings':    return t('settingLong.user')
    case 'projectSettings': return t('settingLong.project')
    case 'localSettings':   return t('settingLong.local')
    case 'flagSettings':    return t('settingLong.flag')
    case 'policySettings':  return t('settingLong.managed')
    case 'cliArg':          return t('settingLong.cliArg')
    case 'command':         return t('settingLong.command')
    case 'session':         return t('settingLong.session')
  }
}

/**
 * Get display name for a setting or permission rule source (capitalized, for UI labels)
 * @param source The setting source or permission rule source
 * @returns Display name for the source with first letter capitalized
 */
export function getSettingSourceDisplayNameCapitalized(
  source: SettingSource | 'cliArg' | 'command' | 'session',
): string {
  switch (source) {
    case 'userSettings':
      return 'User settings'
    case 'projectSettings':
      return 'Shared project settings'
    case 'localSettings':
      return 'Project local settings'
    case 'flagSettings':
      return 'Command line arguments'
    case 'policySettings':
      return 'Enterprise managed settings'
    case 'cliArg':
      return 'CLI argument'
    case 'command':
      return 'Command configuration'
    case 'session':
      return 'Current session'
  }
}

/**
 * Parse the --setting-sources CLI flag into SettingSource array
 * @param flag Comma-separated string like "user,project,local"
 * @returns Array of SettingSource values
 */
export function parseSettingSourcesFlag(flag: string): SettingSource[] {
  if (flag === '') return []

  const names = flag.split(',').map(s => s.trim())
  const result: SettingSource[] = []

  for (const name of names) {
    switch (name) {
      case 'user':
        result.push('userSettings')
        break
      case 'project':
        result.push('projectSettings')
        break
      case 'local':
        result.push('localSettings')
        break
      default:
        throw new Error(
          `Invalid setting source: ${name}. Valid options are: user, project, local`,
        )
    }
  }

  return result
}

/**
 * Get enabled setting sources with policy/flag always included
 * @returns Array of enabled SettingSource values
 */
export function getEnabledSettingSources(): SettingSource[] {
  const allowed = getAllowedSettingSources()

  // Always include policy and flag settings
  const result = new Set<SettingSource>(allowed)
  result.add('policySettings')
  result.add('flagSettings')
  return Array.from(result)
}

/**
 * Check if a specific source is enabled
 * @param source The source to check
 * @returns true if the source should be loaded
 */
export function isSettingSourceEnabled(source: SettingSource): boolean {
  const enabled = getEnabledSettingSources()
  return enabled.includes(source)
}

/**
 * Editable setting sources (excludes policySettings and flagSettings which are read-only)
 */
export type EditableSettingSource = Exclude<
  SettingSource,
  'policySettings' | 'flagSettings'
>

/**
 * List of sources where permission rules can be saved, in display order.
 * Used by permission-rule and hook-save UIs to present source options.
 */
export const SOURCES = [
  'localSettings',
  'projectSettings',
  'userSettings',
] as const satisfies readonly EditableSettingSource[]

/**
 * The JSON Schema URL for Claude Code settings
 * You can edit the contents at https://github.com/SchemaStore/schemastore/blob/master/src/schemas/json/claude-code-settings.json
 */
export const CLAUDE_CODE_SETTINGS_SCHEMA_URL =
  'https://json.schemastore.org/claude-code-settings.json'
