import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { formsOf } from '../../shared/links.ts'
import { listingOptionsFor } from '../../shared/listings.ts'
import {
  glyphSignature,
  projectSignature,
  signatureIndexOf,
  varietyOf,
} from '../../shared/row.ts'
import {
  applyKoreanColumnDefault,
  COLUMNS,
  DEFAULT_HIDDEN_COLUMNS,
  REGIONS,
  type CharRow,
  type CharsData,
  type Column,
  type Region,
} from '../../shared/types.ts'
import { DATA_DIR } from '../sources.ts'

const data: CharsData = JSON.parse(
  readFileSync(join(DATA_DIR, 'chars.json'), 'utf8'),
)
const rows = new Map(data.rows.map((row) => [row.key, row]))
const row = (key: string): CharRow => {
  const found = rows.get(key)
  if (!found) throw new Error(`${key} is not listed`)
  return found
}

/** Indices of the regions left when `hidden` are switched off. */
const without = (...hidden: Region[]) =>
  REGIONS.filter((region) => !hidden.includes(region)).map((region) =>
    REGIONS.indexOf(region),
  )

const ALL_COLUMNS = [...REGIONS].map((region) => REGIONS.indexOf(region))
const DEFAULT_COLUMNS = without('kr')

describe('column ordering', () => {
  it('shows mainland, Japan, old Japan, Hong Kong, Taiwan, then Korea', () => {
    expect(COLUMNS).toEqual(['cn', 'jp', 'old', 'hk', 'tw', 'kr'])
    expect(COLUMNS.map(signatureIndexOf)).toEqual([0, 3, 5, 1, 2, 4])
    expect(
      projectSignature(
        glyphSignature(row('國')),
        COLUMNS.map(signatureIndexOf),
      ),
    ).toBe('001111')
  })
})

describe('locale-aware column defaults', () => {
  it('shows Korea for Korean while preserving every other hidden column', () => {
    expect(applyKoreanColumnDefault(DEFAULT_HIDDEN_COLUMNS, true)).toEqual([])
    expect(applyKoreanColumnDefault(['cn', 'kr'], true)).toEqual(['cn'])
    expect(applyKoreanColumnDefault(['cn'], false)).toEqual(['cn', 'kr'])
  })
})

describe('reading a partition over the columns on show', () => {
  it('leaves a full row exactly as the data ships it', () => {
    for (const key of ['返', '骨', '海', '的'])
      expect(projectSignature(row(key).glyph, ALL_COLUMNS)).toBe(row(key).glyph)
  })

  it('renumbers from the first column still on show', () => {
    // 骨 runs CN | HK | TW | HK | HK. Drop the mainland and HK leads.
    expect(projectSignature(row('骨').glyph, without('cn'))).toBe('0100')
    expect(varietyOf(projectSignature(row('骨').glyph, without('cn')))).toBe(2)
  })

  it('merges regions that only ever differed through a hidden column', () => {
    // In the original four columns 海 differs only in Japan; Korea is also
    // different, but is hidden by default.
    expect(row('海').glyph).toBe('00012')
    expect(projectSignature(row('海').glyph, without('jp', 'kr'))).toBe('000')
  })

  it('keeps a genuine disagreement when an unrelated column goes', () => {
    expect(projectSignature(row('返').glyph, without('jp', 'kr'))).toBe('012')
  })

  it('projects the default view onto the original four regions', () => {
    expect(DEFAULT_HIDDEN_COLUMNS).toEqual(['kr'])
    expect(projectSignature(row('返').glyph, DEFAULT_COLUMNS)).toBe('0123')
    expect(projectSignature(row('青').glyph, DEFAULT_COLUMNS)).toBe('0010')
  })

  it('compares the kyujitai on the same numbering as the regions', () => {
    // 國: the mainland and Japan write 国, Hong Kong and Taiwan write 國 --
    // and so does the Japanese old form.
    expect(glyphSignature(row('國'))).toBe('011011')
    const columns = (...keep: Column[]) => keep.map(signatureIndexOf)
    expect(
      projectSignature(glyphSignature(row('國')), columns('hk', 'tw', 'old')),
    ).toBe('000')
    expect(
      projectSignature(glyphSignature(row('國')), columns('cn', 'old')),
    ).toBe('01')
  })

  it('has nothing to say about a row with no old form', () => {
    expect(glyphSignature(row('返'))).toBe(row('返').glyph)
  })
})

describe('controls that belong to a hidden column', () => {
  it('offers every listing choice while every column is on show', () => {
    expect(listingOptionsFor([...COLUMNS])).toHaveLength(10)
  })

  it('drops the levels of a region that is off the page', () => {
    const ids = listingOptionsFor(['cn', 'hk', 'tw', 'old']).map((o) => o.id)
    expect(ids).not.toContain('jp1')
    expect(ids).not.toContain('jp2')
    // The old forms are a column of their own and stay on their own terms.
    expect(ids).toContain('old')
  })

  it('drops the old-form choice with the old-form column', () => {
    expect(listingOptionsFor([...REGIONS]).map((o) => o.id)).not.toContain(
      'old',
    )
  })

  it('does not offer the Korean list while its default-hidden column is off', () => {
    expect(
      listingOptionsFor(['cn', 'hk', 'tw', 'jp', 'old']).map((o) => o.id),
    ).not.toContain('kr1')
  })
})

describe('outside references follow the columns on show', () => {
  it('lists every form by default', () => {
    expect(formsOf(row('國')).map((form) => form.char)).toContain('国')
  })

  it('leaves out a form only a hidden region writes', () => {
    expect(
      formsOf(row('國'), ['hk', 'tw']).map((form) => form.char),
    ).not.toContain('国')
  })
})
