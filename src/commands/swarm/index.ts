import type { LocalJSXCommand } from '../../types/command.js'

const swarm: LocalJSXCommand = {
  name: 'swarm',
  description:
    'Launch a Matrix-style multi-agent swarm on an epic. Agents plan, execute in parallel, communicate via bus, and synthesize.',
  isEnabled: () => true,
  type: 'local-jsx',
  source: 'builtin',
  load: () => import('./swarm.js'),
}

export default swarm
