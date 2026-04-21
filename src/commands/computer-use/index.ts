import type { Command } from '../../commands.js'

const computerUse = {
  type: 'local',
  name: 'computer-use',
  description: 'Enable/disable Computer Use (screenshot + mouse/keyboard control)',
  argumentHint: '[on|off|status]',
  supportsNonInteractive: true,
  load: () => import('./computer-use.js'),
} satisfies Command

export default computerUse
