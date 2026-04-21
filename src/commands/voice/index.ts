import type { Command } from '../../commands.js'

const voice = {
  type: 'local',
  name: 'voice',
  description: 'Toggle push-to-talk voice mode (Anthropic STT or Whisper endpoint)',
  supportsNonInteractive: false,
  load: () => import('./voice.js'),
} satisfies Command

export default voice
