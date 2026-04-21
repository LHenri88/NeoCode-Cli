import { spawnSync } from 'child_process'
import type { ToolUseContext } from '../../Tool.js'
import type {
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../../types/command.js'
import { getPreferredLanguage, setPreferredLanguage } from '../../utils/config.js'
import instances from '../../ink/instances.js'

const SUPPORTED_LANGUAGES = ['en', 'pt', 'es'] as const
type SupportedLang = (typeof SUPPORTED_LANGUAGES)[number]

const LANG_NAMES: Record<SupportedLang, string> = {
  en: 'English',
  pt: 'Português',
  es: 'Español',
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  _context: ToolUseContext & LocalJSXCommandContext,
  args: string,
): Promise<null> {
  const current = getPreferredLanguage() as SupportedLang
  const arg = args?.trim().toLowerCase() as SupportedLang | undefined

  if (!arg) {
    const list = SUPPORTED_LANGUAGES.map(l => `  ${l} — ${LANG_NAMES[l]}`).join('\n')
    onDone(
      `Current language: ${LANG_NAMES[current] ?? current} (${current})\n\nAvailable:\n${list}\n\nUsage: /language <code>`,
      { display: 'system' },
    )
    return null
  }

  if (!SUPPORTED_LANGUAGES.includes(arg)) {
    onDone(
      `Unsupported language "${arg}". Available: ${SUPPORTED_LANGUAGES.join(', ')}`,
      { display: 'system' },
    )
    return null
  }

  if (arg === current) {
    onDone(
      `Language is already set to ${LANG_NAMES[arg]} (${arg}).`,
      { display: 'system' },
    )
    return null
  }

  setPreferredLanguage(arg)

  onDone(
    `Language changed to ${LANG_NAMES[arg]} (${arg}). Restarting…`,
    { display: 'system' },
  )

  // Give Ink time to render the message, then tear down and re-exec
  setTimeout(() => {
    instances.forEach(i => i.unmount())
    spawnSync(process.argv[0], process.argv.slice(1), {
      stdio: 'inherit',
      env: process.env,
    })
    process.exit(0)
  }, 600)

  return null
}