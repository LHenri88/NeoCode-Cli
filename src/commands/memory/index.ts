import type { Command } from '../../commands.js'

const memory: Command = {
  type: 'local-jsx',
  name: 'memory',
  description: 'Manage NeoCode memory files, Memory Palace search, and graph views',
  load: () => import('./memory.js'),
}

export default memory
