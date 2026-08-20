import { describe, expect, it } from 'vitest'
import {
  applicablePatternChoices,
  DEFAULT_PATTERN_CHOICES,
  parsePatternChoices,
  patternChoicesMatch,
  serializePatternChoices,
  toggleExactPatternChoice,
  toggleVarietyChoice,
} from '../../shared/patterns.ts'

const FOUR_COLUMN_PATTERNS = [
  '0000',
  '0001',
  '0010',
  '0011',
  '0012',
  '0100',
  '0101',
  '0102',
  '0110',
  '0111',
  '0112',
  '0120',
  '0121',
  '0122',
  '0123',
]

describe('broad difference-pattern choices', () => {
  it('excludes identical rows by default', () => {
    expect(patternChoicesMatch('0000', DEFAULT_PATTERN_CHOICES)).toBe(false)
    expect(patternChoicesMatch('0001', DEFAULT_PATTERN_CHOICES)).toBe(true)
    expect(patternChoicesMatch('0112', DEFAULT_PATTERN_CHOICES)).toBe(true)
    expect(patternChoicesMatch('0123', DEFAULT_PATTERN_CHOICES)).toBe(true)
    expect(patternChoicesMatch('01234', DEFAULT_PATTERN_CHOICES)).toBe(true)
  })

  it('lets an exact pattern replace its broad group', () => {
    expect(toggleExactPatternChoice(DEFAULT_PATTERN_CHOICES, '0001')).toEqual([
      '0001',
      'v3',
      'v4',
      'v5',
    ])
  })

  it('lets the broad group replace its exact children', () => {
    expect(
      toggleVarietyChoice(['0001', '0010', 'v3', 'v4'], 2, ['0001', '0010']),
    ).toEqual(['v2', 'v3', 'v4'])
  })
})

describe('pattern choices and hidden columns', () => {
  it('keeps four-column choices serialized but does not apply them to three columns', () => {
    const choices = ['0123', 'v2', 'v4']
    const available = ['000', '001', '010', '011', '012']
    expect(applicablePatternChoices(choices, available)).toEqual(['v2'])
    expect(choices).toEqual(['0123', 'v2', 'v4'])
  })

  it('restores every applicable choice when all columns return', () => {
    expect(
      applicablePatternChoices(['0123', 'v2', 'v4'], FOUR_COLUMN_PATTERNS),
    ).toEqual(['0123', 'v2', 'v4'])
  })
})

describe('pattern choice URL encoding', () => {
  it('includes five-form rows in the serialized default', () => {
    expect(serializePatternChoices(DEFAULT_PATTERN_CHOICES)).toBe('v2,v3,v4,v5')
  })

  it('keeps an explicit five-form opt-out in the URL', () => {
    const value = ['v2', 'v3', 'v4']
    expect(serializePatternChoices(value)).toBe('v2,v3,v4')
    expect(parsePatternChoices(serializePatternChoices(value))).toEqual(value)
  })

  it('round-trips broad and exact choices', () => {
    const value = ['v3', '0001', 'v2']
    expect(parsePatternChoices(serializePatternChoices(value))).toEqual([
      '0001',
      'v2',
      'v3',
    ])
  })

  it('uses an explicit value for an unfiltered table', () => {
    expect(serializePatternChoices([])).toBe('all')
    expect(parsePatternChoices('all')).toEqual([])
  })
})
