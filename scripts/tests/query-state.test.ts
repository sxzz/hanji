import { describe, expect, it } from 'vitest'
import { asRange } from '../../app/composables/query-state.ts'

describe('stroke range query parsing', () => {
  it.each([
    ['1-36', [1, 36]],
    ['10-10', [10, 10]],
  ])('accepts %s', (raw, expected) => {
    expect(asRange.parse(raw)).toEqual(expected)
  })

  it.each([
    // Reversed bounds would match nothing yet read as a legitimate empty table.
    '20-10',
    // A third segment would otherwise be dropped without a trace.
    '1-2-3',
    'x-10',
    '10-x',
    '10-',
  ])('rejects %s so the query falls back to the default', (raw) => {
    expect(() => asRange.parse(raw)).toThrow()
  })
})
