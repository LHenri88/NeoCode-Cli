import { spawnSync } from 'child_process'
import * as React from 'react'
import instances from '../../ink/instances.js'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandContext, LocalJSXCommandOnDone } from '../../types/command.js'
import type { ToolUseContext } from '../../Tool.js'
import { getPreferredLanguage, setPreferredLanguage } from '../../utils/config.js'
import type { PreferredLanguage } from '../../utils/config.js'
import { t } from '../../utils/i18n.js'
import { Select } from '../../components/CustomSelect/index.js'
import { Pane } from '../../components/design-system/Pane.js'
import { Byline } from '../../components/design-system/Byline.js'
import { KeyboardShortcutHint } from '../../components/design-system/KeyboardShortcutHint.js'

const LANG_OPTIONS: { label: string; value: PreferredLanguage; description: string }[] = [
  { label: 'English',    value: 'en', description: 'English interface' },
  { label: 'Português',  value: 'pt', description: 'Interface em português' },
  { label: 'Español',    value: 'es', description: 'Interfaz en español' },
]

function restartCLI() {
  setTimeout(() => {
    instances.forEach(i => i.unmount())
    spawnSync(process.argv[0], process.argv.slice(1), {
      stdio: 'inherit',
      env: process.env,
    })
    process.exit(0)
  }, 400)
}

type Props = {
  onDone: LocalJSXCommandOnDone
  initialLang: PreferredLanguage
}

function LanguagePicker({ onDone, initialLang }: Props) {
  const handleSelect = React.useCallback(
    (lang: PreferredLanguage) => {
      const name = LANG_OPTIONS.find(o => o.value === lang)?.label ?? lang
      if (lang === initialLang) {
        onDone(t('language.alreadySet', { name, code: lang }), { display: 'system' })
        return
      }
      setPreferredLanguage(lang)
      onDone(t('language.restarting', { name, code: lang }), { display: 'system' })
      restartCLI()
    },
    [onDone, initialLang],
  )

  const handleCancel = React.useCallback(() => {
    onDone(t('language.cancelled'), { display: 'system' })
  }, [onDone])

  const currentName = LANG_OPTIONS.find(o => o.value === initialLang)?.label ?? initialLang

  return (
    <Pane color="permission">
      <Box flexDirection="column" gap={1}>
        <Text bold color="permission">{t('language.title')}</Text>
        <Text dimColor>{t('language.current')} {currentName} ({initialLang})</Text>
        <Select
          options={LANG_OPTIONS}
          onChange={handleSelect}
          onCancel={handleCancel}
          defaultValue={initialLang}
          defaultFocusValue={initialLang}
          visibleOptionCount={LANG_OPTIONS.length}
        />
        <Box>
          <Text dimColor italic>
            <Byline>
              <KeyboardShortcutHint shortcut="Enter" action="select" />
              <KeyboardShortcutHint shortcut="Esc"   action="cancel" />
            </Byline>
          </Text>
        </Box>
      </Box>
    </Pane>
  )
}

export const call = async (
  onDone: LocalJSXCommandOnDone,
  _context: ToolUseContext & LocalJSXCommandContext,
  _args: string,
): Promise<React.ReactNode> => {
  const initialLang = getPreferredLanguage() as PreferredLanguage
  return <LanguagePicker onDone={onDone} initialLang={initialLang} />
}