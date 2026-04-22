import type { Command } from '../../commands.js'

const privacy = {
  type: 'local',
  name: 'privacy',
  description: 'Manage privacy consents and view privacy settings',
  argumentHint: '[grant|revoke|list|status] [type]',
  supportsNonInteractive: true,
  load: () => import('./privacy.js'),
} satisfies Command

export default privacy
