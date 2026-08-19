import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { formsOf } from '../../shared/links.ts'
import { listingOptionsFor } from '../../shared/listings.ts'
import {
  glyphSignature,
  projectSignature,
  varietyOf,
} from '../../shared/row.ts'
import { COLUMNS, REGIONS } from '../../shared/types.ts'
import { DATA_DIR } from '../sources.ts'
import type { CharRow, CharsData, Column, Region } from '../../shared/types.ts'

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

describe('reading a partition over the columns on show', () => {
  it('leaves a full row exactly as the data ships it', () => {
    for (const key of ['返', '骨', '海', '的'])
      expect(projectSignature(row(key).glyph, ALL_COLUMNS)).toBe(row(key).glyph)
  })

  it('renumbers from the first column still on show', () => {
    // 骨 runs CN | HK | TW | HK. Drop the mainland and Hong Kong leads.
    expect(projectSignature(row('骨').glyph, without('cn'))).toBe('010')
    expect(varietyOf(projectSignature(row('骨').glyph, without('cn')))).toBe(2)
  })

  it('merges regions that only ever differed through a hidden column', () => {
    // 海 is written one way everywhere but Japan, so hiding Japan leaves one
    // form rather than a row of three cells and a gap.
    expect(row('海').glyph).toBe('0001')
    expect(projectSignature(row('海').glyph, without('jp'))).toBe('000')
  })

  it('keeps a genuine disagreement when an unrelated column goes', () => {
    expect(projectSignature(row('返').glyph, without('jp'))).toBe('012')
  })

  it('compares the kyujitai on the same numbering as the regions', () => {
    // 國: the mainland and Japan write 国, Hong Kong and Taiwan write 國 --
    // and so does the Japanese old form.
    expect(glyphSignature(row('國'))).toBe('01101')
    const columns = (...keep: Column[]) =>
      keep.map((column) => COLUMNS.indexOf(column))
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
    expect(listingOptionsFor([...COLUMNS])).toHaveLength(9)
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
