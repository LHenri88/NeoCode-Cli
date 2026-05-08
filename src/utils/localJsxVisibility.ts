import type { SetToolJSXFn } from '../Tool.js'

type ToolJSXState = Parameters<SetToolJSXFn>[0]

/**
 * Only mounted local-jsx dialogs should block the normal REPL input path.
 * A stale `isLocalJSXCommand` flag with `jsx: null` is recoverable state.
 */
export function isLocalJsxVisible(toolJSX: ToolJSXState): boolean {
  return toolJSX?.isLocalJSXCommand === true && toolJSX.jsx != null
}
