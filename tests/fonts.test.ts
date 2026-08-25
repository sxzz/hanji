/**
 * End-to-end check of this project's central claim: the differences derived
 * from the five Adobe CMaps are the differences the subset fonts actually
 * draw.
 *
 * One side is plain-text CMap arithmetic, the other is real glyph outlines. If
 * they ever disagree, the table would be labelling differences the reader
 * cannot see.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import * as fontkit from 'fontkit'
import { describe, expect, it } from 'vitest'
import { messages } from '../app/locales/all.ts'
import { partitionSignature } from '../scripts/cmap.ts'
import { DATA_DIR, FONT_DIR } from '../scripts/sources.ts'
import { frequencyRankOf } from '../shared/frequency.ts'
import { formsOf } from '../shared/links.ts'
import { LIST_PAGE_SIZE } from '../shared/listings.ts'
import {
  fontIndexOf,
  fontRegionOf,
  projectSignature,
  usesSupplementalFont,
  varietyOf,
} from '../shared/row.ts'
import {
  FREQUENCY_REGIONS,
  REGIONS,
  STYLES,
  type CharsData,
  type FrequencyRegion,
  type Style,
} from '../shared/types.ts'

const data: CharsData = JSON.parse(
  readFileSync(join(DATA_DIR, 'chars.json'), 'utf8'),
)
const rows = new Map(data.rows.map((row) => [row.key, row]))

/** The data, rather than this test, decides which codepoints Noto cannot draw. */
const supplementalChars = Object.fromEntries(
  STYLES.map((style) => [style, new Set<string>()]),
) as Record<Style, Set<string>>

for (const row of data.rows) {
  for (const style of STYLES) {
    for (const [index, region] of REGIONS.entries())
      if (usesSupplementalFont(row, region, style))
        supplementalChars[style].add(row.chars[index]!)
    if (row.old && usesSupplementalFont(row, 'old', style))
      supplementalChars[style].add(row.old.char)
    for (const form of formsOf(row))
      if (form.column && usesSupplementalFont(row, form.column, style))
        supplementalChars[style].add(form.char)
  }
}

function unicodeRange(chars: Iterable<string>): string {
  const points = [...chars]
    .map((char) => char.codePointAt(0)!)
    .toSorted((left, right) => left - right)
  const parts: string[] = []
  for (let index = 0; index < points.length;) {
    let end = index
    while (end + 1 < points.length && points[end + 1] === points[end]! + 1)
      end++
    const start = points[index]!.toString(16).toUpperCase()
    const finish = points[end]!.toString(16).toUpperCase()
    parts.push(index === end ? `U+${start}` : `U+${start}-${finish}`)
    index = end + 1
  }
  return parts.join(',')
}

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
const supplementalFonts = Object.fromEntries(
  STYLES.map((style) => [
    style,
    fontkit.create(
      readFileSync(join(FONT_DIR, `hanji-rare-${style}.woff2`)),
    ) as fontkit.Font,
  ]),
) as Record<Style, fontkit.Font>

/** Glyph IDs are not comparable across subsets, so compare outlines. */
function outline(region: string, char: string): string {
  for (const { font } of fonts[region]) {
    const [glyph] = font.layout(char).glyphs
    // A missing character falls back to .notdef, which is glyph 0
    if (glyph && glyph.id !== 0) return glyph.path.toSVG()
  }
  throw new Error(`no chunk of hanji-sans-${region} carries ${char}`)
}

function supplementalOutline(style: Style, char: string): string {
  const glyph = supplementalFonts[style].glyphForCodePoint(char.codePointAt(0)!)
  if (glyph.id === 0)
    throw new Error(`hanji-rare-${style}.woff2 does not carry ${char}`)
  return glyph.path.toSVG()
}

function displayedSansOutline(
  row: (typeof data.rows)[number],
  region: number,
): string {
  const column = REGIONS[region]!
  return usesSupplementalFont(row, column, 'sans')
    ? supplementalOutline('sans', row.chars[region]!)
    : outline(REGIONS[fontIndexOf(row, region)]!, row.chars[region]!)
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
      for (const index of REGIONS.keys())
        expect(() => displayedSansOutline(row, index)).not.toThrow()
  })

  it('draws every codepoint assigned to a bundled supplemental font', () => {
    for (const style of STYLES) {
      expect(supplementalChars[style].size).toBeGreaterThan(0)
      for (const char of supplementalChars[style])
        expect(() => supplementalOutline(style, char)).not.toThrow()
    }
  })

  it('publishes data-driven supplemental webfonts', () => {
    for (const style of STYLES) {
      const file = join(FONT_DIR, `hanji-rare-${style}.woff2`)
      const font = supplementalFonts[style]
      const chars = supplementalChars[style]
      expect(statSync(file).size).toBeGreaterThan(0)
      for (const char of chars)
        expect(font.glyphForCodePoint(char.codePointAt(0)!).id).not.toBe(0)
      expect(font.characterSet.toSorted((left, right) => left - right)).toEqual(
        [...chars]
          .map((char) => char.codePointAt(0)!)
          .toSorted((left, right) => left - right),
      )

      const css = readFileSync(join(FONT_DIR, 'fonts-critical.css'), 'utf8')
      expect(css).toContain(`unicode-range: ${unicodeRange(chars)};`)
    }
  })

  it('carries the kyujitai in the Japanese font', () => {
    const withOld = data.rows.filter((r) => r.old).slice(0, 40)
    expect(withOld.length).toBeGreaterThan(0)
    for (const row of withOld)
      expect(() =>
        usesSupplementalFont(row, 'old', 'sans')
          ? supplementalOutline('sans', row.old!.char)
          : outline('jp', row.old!.char),
      ).not.toThrow()
  })
})

describe('subset loading', () => {
  // Stored-region indices in the default presentation order. Korea and the
  // optional old-form cell start hidden.
  const visible = [0, 3, 1, 2] as const
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
      .slice(0, LIST_PAGE_SIZE)
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

  it('publishes only initial display ranges as critical CSS', () => {
    const css = readFileSync(join(FONT_DIR, 'fonts-critical.css'), 'utf8')
    const uiCss = readFileSync(join(FONT_DIR, 'fonts-ui.css'), 'utf8')
    for (const style of STYLES) {
      for (const region of REGIONS)
        expect(css).toContain(`hanji-${style}-${region}-0.woff2`)
      for (const locale of Object.keys(messages)) {
        for (let index = 0; index < 4; index++) {
          const stylesheet =
            style === 'sans' && locale === 'zh-CN' ? css : uiCss
          expect(stylesheet).toContain(`ui-${style}-${locale}-${index}.woff2`)
        }
        expect(css).not.toContain(`ui-${style}-${locale}-4.woff2`)
      }
      expect(style === 'sans' ? css : uiCss).toContain(
        `ui-latin-${style}.woff2`,
      )
    }
    expect(css).not.toContain('hanji-sans-cn-1.woff2')
  })
})

describe('interface subset coverage', () => {
  it('carries every Korean reading in every locale font', () => {
    const hangul = [
      ...new Set(
        data.rows.flatMap((row) => row.readings?.korean ?? []).join(''),
      ),
    ]
    const uiFonts = Object.fromEntries(
      ['zh-CN', 'zh-TW', 'zh-HK', 'ja-JP', 'ko-KR'].map((locale) => [
        locale,
        readdirSync(FONT_DIR)
          .filter((name) =>
            new RegExp(String.raw`^ui-sans-${locale}-\d+\.woff2$`).test(name),
          )
          .map((name) => ({
            name,
            font: fontkit.create(
              readFileSync(join(FONT_DIR, name)),
            ) as fontkit.Font,
          })),
      ]),
    )

    expect(hangul.length).toBeGreaterThan(300)
    expect(Object.keys(uiFonts)).toHaveLength(5)
    for (const [locale, fonts] of Object.entries(uiFonts)) {
      expect(fonts.length).toBeGreaterThan(1)
      for (const char of hangul)
        expect(
          fonts.some(
            ({ font }) => font.glyphForCodePoint(char.codePointAt(0)!).id !== 0,
          ),
          `${locale} UI subsets do not carry ${char}`,
        ).toBe(true)
    }
  })
})
