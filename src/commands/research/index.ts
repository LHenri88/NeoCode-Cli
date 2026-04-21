import type { Command } from '../../commands.js'

const research = {
  type: 'local-jsx',
  name: 'research',
  description: 'Run targeted web research with source citations',
  load: () => import('./research.js'),
} satisfies Command

export default research
