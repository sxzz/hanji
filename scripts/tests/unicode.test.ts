import { describe, expect, it } from 'vitest'
import { isUnicodeScalarValue } from '../../app/utils/unicode.ts'

describe('Unicode scalar values', () => {
  it.each([0, 0xd7ff, 0xe000, 0x10ffff])('accepts U+%s', (codePoint) => {
    expect(isUnicodeScalarValue(codePoint)).toBe(true)
  })

  it.each([-1, 0xd800, 0xdfff, 0x110000, 0xffffff])(
    'rejects 0x%s',
    (codePoint) => {
      expect(isUnicodeScalarValue(codePoint)).toBe(false)
    },
  )
})
