import type { Command } from '../../commands.js'

const createSkill = {
  type: 'local-jsx',
  name: 'create-skill',
  description: 'Create a new skill with proper directory structure and template',
  load: () => import('./create-skill.js'),
} satisfies Command

export default createSkill
