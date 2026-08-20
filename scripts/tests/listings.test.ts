import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createListingMatcher, LISTING_OPTIONS } from '../../shared/listings.ts'
import { DATA_DIR } from '../sources.ts'
import type { CharRow, CharsData } from '../../shared/types.ts'

const data: CharsData = JSON.parse(
  readFileSync(join(DATA_DIR, 'chars.json'), 'utf8'),
)
const rows = new Map(data.rows.map((row) => [row.key, row]))
const row = (key: string): CharRow => {
  const found = rows.get(key)
  if (!found) throw new Error(`${key} is not listed`)
  return found
}

describe('listing filters', () => {
  it('offers Japanese old forms as a listing choice', () => {
    expect(LISTING_OPTIONS).toContainEqual({
      id: 'old',
      kind: 'old',
      region: 'jp',
    })
  })

  it('offers the Korean education list as a listing choice', () => {
    expect(LISTING_OPTIONS).toContainEqual({
      id: 'kr1',
      kind: 'tier',
      region: 'kr',
      tier: 1,
    })
  })

  it('matches only rows with a Japanese old form', () => {
    const matchesOld = createListingMatcher(['old'])
    expect(matchesOld(row('國'))).toBe(true)
    expect(matchesOld(row('骨'))).toBe(false)
  })

  it('widens choices within Japan and narrows across regions', () => {
    const matchesJapanese = createListingMatcher(['jp1', 'old'])
    // 國 is in tier 2, but its old form still matches the jp1 + old union.
    expect(matchesJapanese(row('國'))).toBe(true)
    expect(matchesJapanese(row('骨'))).toBe(false)

    // A listing choice from another region remains an additional requirement.
    expect(createListingMatcher(['cn1', 'old'])(row('國'))).toBe(true)
    expect(createListingMatcher(['cn2', 'old'])(row('國'))).toBe(false)
  })

  it('matches Korean basic hanja, including the Korean-only 畓', () => {
    const matchesKorean = createListingMatcher(['kr1'])
    expect(matchesKorean(row('國'))).toBe(true)
    expect(matchesKorean(row('畓'))).toBe(true)
    expect(matchesKorean(row('瓶'))).toBe(false)
  })
})
