import type { Command } from '../../commands.js'

const preview = {
  type: 'local-jsx',
  name: 'preview',
  description: 'Manage the web preview dev server (on/off/status/open)',
  argumentHint: '[on|off|status|open]',
  immediate: true,
  load: () => import('./preview.js'),
} satisfies Command

export default preview
