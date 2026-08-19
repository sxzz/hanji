import { describe, expect, it } from 'vitest'
import { shouldUseViewTransition } from '../../app/utils/view-transition.ts'

describe('route view transitions', () => {
  it.each([
    ['/', '/char/返'],
    ['/char/返', '/'],
    ['/char/%E8%BF%94', '/'],
  ])('enables %s -> %s', (from, to) => {
    expect(shouldUseViewTransition(from, to)).toBe(true)
  })

  it.each([
    ['/', '/about'],
    ['/about', '/'],
    ['/about', '/char/返'],
    ['/char/返', '/about'],
    ['/char/返', '/char/後'],
    ['/', '/'],
  ])('disables %s -> %s', (from, to) => {
    expect(shouldUseViewTransition(from, to)).toBe(false)
  })
})
