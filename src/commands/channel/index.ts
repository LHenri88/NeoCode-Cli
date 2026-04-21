import type { Command } from '../../commands.js'

const channel = {
  type: 'local',
  name: 'channel',
  description: 'Configure notification channels (telegram, discord, webhook)',
  argumentHint: '<telegram|discord|webhook|status> [args...]',
  supportsNonInteractive: true,
  load: () => import('./channel.js'),
} satisfies Command

export default channel
