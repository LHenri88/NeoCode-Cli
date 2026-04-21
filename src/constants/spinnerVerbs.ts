import { getInitialSettings } from '../utils/settings/settings.js'

// ── Locale verb pools ──────────────────────────────────────────────────────────

/** Matrix/NeoCode cyberpunk verbs — English */
export const SPINNER_VERBS_EN: string[] = [
  'Awakening',
  'Syncing',
  'Loading',
  'Decoding',
  'Rebooting',
  'Tracing',
  'Unlocking',
  'Connecting',
  'Compiling',
  'Resisting',
  'Glitching',
  'Reconstructing',
  'Evolving',
  'Converging',
]

/** Matrix/NeoCode cyberpunk verbs — Português */
export const SPINNER_VERBS_PT: string[] = [
  'Despertando',
  'Sincronizando',
  'Decodificando',
  'Reiniciando',
  'Rastreando',
  'Desbloqueando',
  'Compilando',
  'Liberando',
  'Hackeando',
  'Quebrando',
  'Reconstruindo',
  'Evoluindo',
  'Convergindo',
]

/**
 * Default pool: all verbs combined (bilingual).
 * Used as fallback when no language is configured.
 */
export const SPINNER_VERBS: string[] = [...SPINNER_VERBS_EN, ...SPINNER_VERBS_PT]

// ── Locale detection ───────────────────────────────────────────────────────────

/**
 * Resolve which verb pool to use based on `settings.language`.
 *
 * Matching rules (case-insensitive, substring):
 *   "pt" | "portuguese" | "brasil" | "br" | "pt-br" → Portuguese only
 *   "en" | "english"                                 → English only
 *   anything else / not set                           → both pools combined
 */
function getLocaleVerbs(): string[] {
  const lang = (getInitialSettings().language ?? '').toLowerCase().trim()

  if (!lang) return SPINNER_VERBS

  const isPt =
    lang === 'pt' ||
    lang.startsWith('pt-') ||
    lang.includes('portugu') ||
    lang.includes('brasil') ||
    lang.includes('brazil') ||
    lang === 'br'

  if (isPt) return SPINNER_VERBS_PT

  const isEn =
    lang === 'en' ||
    lang.startsWith('en-') ||
    lang.includes('engl') ||
    lang.includes('ingl')

  if (isEn) return SPINNER_VERBS_EN

  // Unknown language → bilingual pool
  return SPINNER_VERBS
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns the active spinner verb list, respecting:
 *   1. `settings.spinnerVerbs` override (replace / append mode) — highest priority
 *   2. `settings.language` locale selection
 *   3. Combined bilingual pool as final fallback
 */
export function getSpinnerVerbs(): string[] {
  const settings = getInitialSettings()
  const baseVerbs = getLocaleVerbs()
  const config = settings.spinnerVerbs

  if (!config) return baseVerbs

  if (config.mode === 'replace') {
    return config.verbs.length > 0 ? config.verbs : baseVerbs
  }

  // append mode: merge locale pool + custom verbs
  return [...baseVerbs, ...config.verbs]
}
