import { describe, expect, it } from 'bun:test'
import { isLocalJsxVisible } from './localJsxVisibility.js'

describe('isLocalJsxVisible', () => {
  it('ignores a stale local-jsx flag when no JSX is mounted', () => {
    expect(
      isLocalJsxVisible({
        jsx: null,
        shouldHidePromptInput: false,
        isLocalJSXCommand: true,
      }),
    ).toBe(false)
  })

  it('returns true for a mounted local-jsx dialog', () => {
    expect(
      isLocalJsxVisible({
        jsx: 'dialog',
        shouldHidePromptInput: false,
        isLocalJSXCommand: true,
      }),
    ).toBe(true)
  })

  it('does not treat regular tool JSX as a local dialog', () => {
    expect(
      isLocalJsxVisible({
        jsx: 'tool output',
        shouldHidePromptInput: false,
      }),
    ).toBe(false)
  })
})
