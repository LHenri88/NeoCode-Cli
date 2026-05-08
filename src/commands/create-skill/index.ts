import type { Command } from '../../commands.js'

const createSkill = {
  type: 'local-jsx',
  name: 'create-skill',
  description: 'Create a new skill - the AI will ask for details and generate the complete skill structure',
  argumentHint: '<skill-name>',
  load: () => import('./create-skill.js'),
} satisfies Command

export default createSkill
