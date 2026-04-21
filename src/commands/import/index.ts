import type { Command } from '../../commands.js'

const importCommand: Command = {
  type: 'local-jsx',
  name: 'import',
  description: 'Import files or skill sets from another local project',
  argumentHint: '<path> [--target <dir>] [--overwrite] [--dry-run]',
  load: () => import('./import.js'),
}

export default importCommand
