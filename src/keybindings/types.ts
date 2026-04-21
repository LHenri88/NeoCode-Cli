/**
 * Shared types for the NeoCode keybinding system.
 *
 * Kept in a separate file so they can be imported by both the schema
 * layer (schema.ts) and the runtime layer (parser.ts, resolver.ts, etc.)
 * without creating circular dependencies.
 */

import type { KEYBINDING_CONTEXTS } from './schema.js'

/** A single parsed keystroke with modifier flags. */
export type ParsedKeystroke = {
  /** The key identifier: printable char (' ', 'a', '3') or name ('escape', 'f1', 'up'). */
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  super: boolean
}

/**
 * A chord is a sequence of one or more keystrokes that must be pressed
 * in order to trigger a binding (e.g. ctrl+k ctrl+s).
 */
export type Chord = ParsedKeystroke[]

/** Valid UI context names where keybindings can be applied. */
export type KeybindingContextName = (typeof KEYBINDING_CONTEXTS)[number]

/**
 * A single keybinding entry after parsing from the JSON config.
 * `action` is null when the binding is an explicit unbind (null in JSON).
 */
export type ParsedBinding = {
  chord: Chord
  action: string | null
  context: KeybindingContextName
}

/**
 * One block from keybindings.json — a context + a map of keystroke → action.
 * Actions can be null (explicit unbind), a known action string, or a
 * `command:<name>` string that executes a slash command.
 */
export type KeybindingBlock = {
  context: KeybindingContextName
  bindings: Record<string, string | null>
}
