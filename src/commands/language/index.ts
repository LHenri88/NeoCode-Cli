import type { Command } from '../../commands.js'

const language = {
  type: 'local-jsx',
  name: 'language',
  description: 'Change the interface language (en, pt, es)',
  argumentHint: '[en|pt|es]',
  immediate: true,
  load: () => import('./language.tsx'),
} satisfies Command

export default language