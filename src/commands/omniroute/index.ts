import type { Command } from '../../commands.js'

const omniroute = {
  type: 'local-jsx',
  name: 'omniroute',
  description: 'Configure and inspect the OmniRoute API gateway fallback',
  argumentHint: '[status|on|off|ping|set <key> <value>|reset]',
  immediate: true,
  load: () => import('./omniroute.js'),
} satisfies Command

export default omniroute
