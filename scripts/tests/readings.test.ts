import { describe, expect, it } from 'vitest'
import { plainReading } from '../../shared/readings.ts'

describe('reading normalization', () => {
  it.each(['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'])(
    'preserves pinyin %s as v while removing its tone',
    (reading) => {
      expect(plainReading(`l${reading}`)).toBe('lv')
    },
  )

  it('handles upper-case and decomposed umlaut u', () => {
    expect(plainReading('LÜ')).toBe('lv')
    expect(plainReading('lu\u{308}\u{30C}')).toBe('lv')
  })

  it('keeps plain u distinct and removes other tone marks', () => {
    expect(plainReading('lù')).toBe('lu')
    expect(plainReading('nián')).toBe('nian')
  })

  it('matches precomposed and decomposed Hangul', () => {
    expect(plainReading('국')).toBe(plainReading('국'))
  })
})
