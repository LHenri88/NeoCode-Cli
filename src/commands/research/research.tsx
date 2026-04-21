import type {
  LocalJSXCommandCall,
  LocalJSXCommandOnDone,
} from '../../types/command.js'

function buildResearchPrompt(topic: string): string {
  return [
    `Research this topic thoroughly: ${topic}`,
    '',
    'Requirements:',
    '- Use web search for any facts that may have changed recently.',
    '- Prefer official documentation, primary sources, or direct vendor materials when available.',
    '- Summarize the answer in practical terms.',
    '- End with a "Sources:" section containing relevant markdown links.',
  ].join('\n')
}

function doneWithUsage(onDone: LocalJSXCommandOnDone): null {
  onDone('Usage: /research <topic>', { display: 'system' })
  return null
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const topic = args.trim()
  if (!topic) {
    return doneWithUsage(onDone)
  }

  onDone(buildResearchPrompt(topic), {
    shouldQuery: true,
  })
  return null
}
