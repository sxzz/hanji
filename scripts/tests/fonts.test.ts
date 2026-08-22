/**
 * End-to-end check of this project's central claim: the differences derived
 * from the five Adobe CMaps are the differences the subset fonts actually
 * draw.
 *
 * One side is plain-text CMap arithmetic, the other is real glyph outlines. If
 * they ever disagree, the table would be labelling differences the reader
 * cannot see.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as fontkit from 'fontkit'
import { describe, expect, it } from 'vitest'
import { frequencyRankOf } from '../../shared/frequency.ts'
import {
  fontIndexOf,
  fontRegionOf,
  projectSignature,
  varietyOf,
} from '../../shared/row.ts'
import {
  FREQUENCY_REGIONS,
  REGIONS,
  type CharsData,
  type FrequencyRegion,
} from '../../shared/types.ts'
import { partitionSignature } from '../cmap.ts'
import { DATA_DIR, FONT_DIR } from '../sources.ts'

const data: CharsData = JSON.parse(
  readFileSync(join(DATA_DIR, 'chars.json'), 'utf8'),
)
const rows = new Map(data.rows.map((row) => [row.key, row]))

/** Which chunk holds a character is not known up front, so open them all. */
const fontsOf = (region: string) =>
  readdirSync(FONT_DIR)
    .filter(
      (f) => f.startsWith(`hanji-sans-${region}-`) && f.endsWith('.woff2'),
    )
    .toSorted()
    .map((name) => ({
      name,
      font: fontkit.create(readFileSync(join(FONT_DIR, name))) as fontkit.Font,
    }))

const fonts = Object.fromEntries(REGIONS.map((r) => [r, fontsOf(r)]))

/** Glyph IDs are not comparable across subsets, so compare outlines. */
function outline(region: string, char: string): string {
  for (const { font } of fonts[region]) {
    const [glyph] = font.layout(char).glyphs
    // A missing character falls back to .notdef, which is glyph 0
    if (glyph && glyph.id !== 0) return glyph.path.toSVG()
  }
  throw new Error(`no chunk of hanji-sans-${region} carries ${char}`)
}

/** Which generated chunk carries this region's character. */
function shardOf(region: string, char: string): number {
  const codePoint = char.codePointAt(0)!
  for (const { name, font } of fonts[region]) {
    if (font.glyphForCodePoint(codePoint).id === 0) continue
    return Number(/-(\d+)\.woff2$/.exec(name)![1]!)
  }
  throw new Error(`no chunk of hanji-sans-${region} carries ${char}`)
}

const outlinesOf = (key: string) => {
  const row = rows.get(key)!
  return row.chars.map((char, i) => outline(REGIONS[fontIndexOf(row, i)], char))
}

describe('what the subsets draw matches what the CMaps decided', () => {
  it.each(['骨', '返', '青', '海', '直', '次', '令', '微'])('%s', (key) => {
    expect(partitionSignature(outlinesOf(key))).toBe(rows.get(key)!.glyph)
  })

  it('draws one shape for cells the data calls the same', () => {
    // 了 and 人 are merged because only the sans faces separated Japan, so the
    // Japanese cell borrows another region's font and must match it exactly
    for (const key of ['了', '人', '的']) {
      expect(new Set(outlinesOf(key)).size).toBe(1)
    }
  })

  it('draws 返 as five genuinely different outlines', () => {
    expect(new Set(outlinesOf('返')).size).toBe(5)
  })

  it('borrows the HK font for 骨 in Japan and Korea', () => {
    expect(fontIndexOf(rows.get('骨')!, 3)).toBe(1)
    expect(fontIndexOf(rows.get('骨')!, 4)).toBe(1)
    const shapes = ['cn', 'hk', 'tw'].map((region) => outline(region, '骨'))
    expect(new Set(shapes).size).toBe(3)
  })
})

describe('subset coverage', () => {
  it('can draw every cell of every sampled row', () => {
    const sample = [
      ...data.rows.slice(0, 60),
      ...data.rows.slice(-60),
      ...data.rows.filter((r) => r.glyph === '01234').slice(0, 40),
    ]
    for (const row of sample)
      for (let i = 0; i < REGIONS.length; i++)
        expect(() =>
          outline(REGIONS[fontIndexOf(row, i)], row.chars[i]),
        ).not.toThrow()
  })

  it('carries the kyujitai in the Japanese font', () => {
    const withOld = data.rows.filter((r) => r.old).slice(0, 40)
    expect(withOld.length).toBeGreaterThan(0)
    for (const row of withOld)
      expect(() => outline('jp', row.old!.char)).not.toThrow()
  })
})

describe('subset loading', () => {
  // Stored-region indices in the default presentation order. Korea and the
  // optional old-form cell start hidden.
  const visible = [0, 3, 1, 2] as const
  const pageSize = 100

  function firstFrequencyPage(region: FrequencyRegion) {
    return data.rows
      .filter((row) => varietyOf(projectSignature(row.glyph, visible)) > 1)
      .toSorted((a, b) => {
        const left = frequencyRankOf(a, region)
        const right = frequencyRankOf(b, region)
        if (left !== right && (left === null || right === null))
          return left === null ? 1 : -1
        return (
          (left ?? Number.MAX_SAFE_INTEGER) -
            (right ?? Number.MAX_SAFE_INTEGER) ||
          a.key.codePointAt(0)! - b.key.codePointAt(0)!
        )
      })
      .slice(0, pageSize)
  }

  it.each(FREQUENCY_REGIONS)(
    'keeps the first %s frequency page in one shard per visible font',
    (frequencyRegion) => {
      const shards = new Set<string>()
      for (const row of firstFrequencyPage(frequencyRegion)) {
        for (const index of visible) {
          const region = fontRegionOf(row, index)
          shards.add(`${region}-${shardOf(region, row.chars[index]!)}`)
        }
      }

      // The hero is visible above the list and follows the same four faces.
      for (const region of ['cn', 'jp', 'hk', 'tw'] as const)
        shards.add(`${region}-${shardOf(region, '返')}`)

      expect([...shards].toSorted()).toEqual(['cn-0', 'hk-0', 'jp-0', 'tw-0'])
    },
  )
})

describe('interface subset coverage', () => {
  it('carries every Korean reading in every locale font', () => {
    const hangul = [
      ...new Set(
        data.rows.flatMap((row) => row.readings?.korean ?? []).join(''),
      ),
    ]
    const uiFonts = readdirSync(FONT_DIR)
      .filter((name) =>
        /^ui-sans-(?:zh-CN|zh-TW|zh-HK|ja-JP|ko-KR)\.woff2$/.test(name),
      )
      .map(
        (name) =>
          [
            name,
            fontkit.create(readFileSync(join(FONT_DIR, name))) as fontkit.Font,
          ] as const,
      )

    expect(hangul.length).toBeGreaterThan(300)
    expect(uiFonts).toHaveLength(5)
    for (const [name, font] of uiFonts)
      for (const char of hangul)
        expect(
          font.glyphForCodePoint(char.codePointAt(0)!).id,
          `${name} does not carry ${char}`,
        ).not.toBe(0)
  })
})
