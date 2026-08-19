/**
 * Builds subset woff2 files from the regional Noto CJK faces, in both sans and
 * serif.
 *
 * The four table columns are pinned to their own region's font and never
 * follow the interface language -- those columns are the content. Self-hosting
 * rather than pulling Google's families keeps the display fonts and the CMaps
 * used to judge the differences on the same source, so what the table claims
 * and what the screen draws cannot drift apart.
 *
 * Two size optimizations:
 *
 * 1. Groups share a font. Regions the data declares to write a character the
 *    same way are drawn from one of their fonts, so the others need not carry
 *    the character. This drops about a third of all glyphs, and it also keeps
 *    the page honest -- cells claimed to be the same come from one glyph.
 *
 * 2. unicode-range chunking. Even so the glyphs total several MB per style,
 *    too much to ship at once. Chunks follow commonness order, so the browser
 *    fetches only the ones holding characters actually on screen.
 */
import { readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import subsetFont from 'subset-font'
import { messages } from '../app/locales/all.ts'
import {
  LOCALE_META,
  localeName,
  LOCALES,
  type Locale,
} from '../app/locales/index.ts'
import { dictLinks, formsOf } from '../shared/links.ts'
import { fontIndexOf } from '../shared/row.ts'
import { REGIONS, STYLES, type CharsData, type Style } from '../shared/types.ts'
import { DATA_DIR, FONT_DIR, raw, SOURCES } from './sources.ts'

/** Region code as Noto names it. */
const NOTO: Record<string, string> = { cn: 'sc', hk: 'hk', tw: 'tc', jp: 'jp' }

const otf = (style: Style, region: string) =>
  `font/Noto${style === 'sans' ? 'Sans' : 'Serif'}CJK${NOTO[region]}-Regular.otf`

/** Characters per chunk. Smaller means a lighter first paint but more
 * @font-face rules and more requests. */
const CHUNK_SIZE = 400

/**
 * The hero character has to be in every region's first chunk, otherwise the
 * landing page pulls an extra chunk per region before it can draw anything.
 * Keep this in sync with HERO_ROW in app/composables/chars.ts.
 */
const HERO_KEY = '返'

const data: CharsData = JSON.parse(
  await readFile(join(DATA_DIR, 'chars.json'), 'utf8'),
)

// Chunk file names shift with the data, so clear stale ones first
for (const name of await readdir(FONT_DIR))
  if (name.endsWith('.woff2')) await unlink(join(FONT_DIR, name))

await writeFile(join(FONT_DIR, 'OFL.txt'), await raw('font/OFL.txt'))

/** Collect the characters each region needs, in row order (commonness order). */
const needed: Record<string, string[]> = Object.fromEntries(
  REGIONS.map((r) => [r, [] as string[]]),
)
const seen: Record<string, Set<string>> = Object.fromEntries(
  REGIONS.map((r) => [r, new Set<string>()]),
)

const need = (region: string, char: string) => {
  if (seen[region]!.has(char)) return
  seen[region]!.add(char)
  needed[region]!.push(char)
}

const collect = (row: (typeof data.rows)[number]) => {
  for (let i = 0; i < REGIONS.length; i++)
    need(REGIONS[fontIndexOf(row, i)]!, row.chars[i]!)
  // The Japanese column also shows kyujitai, which has no group to share with
  if (row.old) need('jp', row.old.char)
  // A key or merged-in name the columns never show still appears on the
  // character page, next to the references that look it up
  for (const form of formsOf(row)) need(form.font, form.char)
}

const hero = data.rows.find((row) => row.key === HERO_KEY)
if (hero) collect(hero)
for (const row of data.rows) collect(row)

/** Sort codepoints and merge consecutive runs to keep unicode-range short. */
function unicodeRange(chars: string[]): string {
  const points = chars.map((c) => c.codePointAt(0)!).toSorted((a, b) => a - b)
  const parts: string[] = []
  const hex = (n: number) => n.toString(16).toUpperCase()
  for (let i = 0; i < points.length;) {
    let end = i
    while (end + 1 < points.length && points[end + 1] === points[end]! + 1)
      end++
    parts.push(
      i === end
        ? `U+${hex(points[i]!)}`
        : `U+${hex(points[i]!)}-${hex(points[end]!)}`,
    )
    i = end + 1
  }
  return parts.join(',')
}

const faces: Record<string, string[]> = { sans: [], serif: [], ui: [] }
let totalBytes = 0

for (const style of STYLES) {
  let styleBytes = 0
  for (const region of REGIONS) {
    const chars = needed[region]!

    const source = await raw(otf(style, region))

    for (let start = 0, index = 0; start < chars.length; start += CHUNK_SIZE) {
      const chunk = chars.slice(start, start + CHUNK_SIZE)
      const subset = await subsetFont(source, chunk.join(''), {
        targetFormat: 'woff2',
        // The table renders isolated single characters, so no OpenType layout
        // is needed. Skipping the layout closure drops vertical and alternate
        // forms that can never be reached here, roughly halving the output.
        noLayoutClosure: true,
      })
      const file = `hanji-${style}-${region}-${index}.woff2`
      await writeFile(join(FONT_DIR, file), subset)
      faces[style]!.push(
        `@font-face {
  font-family: 'Hanji ${style === 'sans' ? 'Sans' : 'Serif'} ${region.toUpperCase()}';
  src: url('/fonts/${file}') format('woff2');
  font-display: swap;
  unicode-range: ${unicodeRange(chunk)};
}`,
      )
      styleBytes += subset.length
      index++
    }
  }
  totalBytes += styleBytes
  console.error(`${style}  ${(styleBytes / 1024 / 1024).toFixed(2)} MB`)
}

/**
 * The interface copy gets the same treatment as the table.
 *
 * Google's Noto Sans SC is chunked by codepoint range, so the few hundred Han
 * characters of interface copy would otherwise pull a dozen chunks and several
 * hundred KB. Subsetting the copy to a single file and putting it ahead of the
 * Google family in the stack means those chunks are declared but never
 * fetched. Each locale is cut from its own regional font, which is also what
 * keeps the interface from displaying the wrong regional glyphs.
 */
const KANA = String.fromCodePoint(
  // Hiragana and katakana in full: Japanese readings are data, so the set of
  // kana a character page might show is not knowable from the copy alone.
  ...Array.from({ length: 0x30ff - 0x3040 + 1 }, (_, i) => 0x3040 + i),
)

/**
 * Everything the interface can render in body type.
 *
 * Besides the message file this has to cover the attribution table (worded in
 * sources.ts), the dictionary names (in links.ts) and kana. Anything missed
 * falls through to Google's Noto Sans SC, which is chunked by codepoint range
 * and will happily fetch a dozen chunks for a handful of characters.
 */
function uiText(): string {
  const sample = data.rows[0]!
  return [
    ALL_UI_TEXT,
    JSON.stringify(SOURCES),
    dictLinks(sample.chars[0]!)
      .map((link) => link.name)
      .join(''),
    KANA,
  ].join('')
}

const UI_FONT: Record<string, (style: Style) => string> = {
  'zh-CN': (style) => otf(style, 'cn'),
  'zh-TW': (style) => otf(style, 'tw'),
  'zh-HK': (style) => otf(style, 'hk'),
  'ja-JP': (style) => otf(style, 'jp'),
}

/**
 * Every locale's copy goes into every locale's subset. The switcher names the
 * other languages in their own words, and a reader who lands on one of them
 * before its chunk arrives sees the default copy in the meantime -- both need
 * glyphs the active subset would not otherwise carry.
 */
const ALL_UI_TEXT = [
  JSON.stringify(messages),
  // The language switcher labels itself from CLDR, not from the copy
  LOCALES.map(localeName).join(''),
].join('')

for (const locale of Object.keys(messages)) {
  const source = UI_FONT[locale]
  if (!source) continue
  const chars = [...new Set(uiText())].join('')
  for (const style of STYLES) {
    const subset = await subsetFont(await raw(source(style)), chars, {
      targetFormat: 'woff2',
      noLayoutClosure: true,
    })
    const file = `ui-${style}-${locale}.woff2`
    await writeFile(join(FONT_DIR, file), subset)
    faces.ui!.push(
      `@font-face {
  font-family: '${LOCALE_META[locale as Locale].uiFamily} ${style === 'sans' ? 'Sans' : 'Serif'}';
  src: url('/fonts/${file}') format('woff2');
  font-display: swap;
}`,
    )
    console.error(
      `${file}  ${chars.length} chars  ${(subset.length / 1024).toFixed(0)} KB`,
    )
  }
}

/**
 * The typeface switch labels itself with 黑 and 宋, each set in the face it
 * names. Those two glyphs have to be available in both faces at all times,
 * whereas the serif stylesheet only arrives once a reader asks for serif --
 * hence this pair of two-character files, declared alongside the interface
 * font and always loaded.
 */
const FACE_SAMPLE = '黑宋'

for (const style of STYLES) {
  const subset = await subsetFont(await raw(otf(style, 'cn')), FACE_SAMPLE, {
    targetFormat: 'woff2',
    noLayoutClosure: true,
  })
  const file = `face-${style}.woff2`
  await writeFile(join(FONT_DIR, file), subset)
  faces.ui!.push(
    `@font-face {
  font-family: 'Hanji Face ${style === 'sans' ? 'Sans' : 'Serif'}';
  src: url('/fonts/${file}') format('woff2');
  font-display: block;
}`,
  )
  console.error(`${file}  ${(subset.length / 1024).toFixed(1)} KB`)
}

const banner = `/* Generated by scripts/build-fonts.ts -- do not edit.
 * Noto Sans CJK and Noto Serif CJK (SIL OFL 1.1), subset to the characters
 * this site uses. Licence text is served alongside at /fonts/OFL.txt.
 */`

// Serif ships as its own stylesheet so the ~140KB of @font-face rules only
// arrive when a reader actually asks for serif.
let cssBytes = 0
for (const [name, rules] of Object.entries(faces)) {
  const css = `${banner}\n\n${rules.join('\n\n')}\n`
  await writeFile(join(FONT_DIR, `fonts-${name}.css`), css)
  cssBytes += css.length
  console.error(`fonts-${name}.css  ${(css.length / 1024).toFixed(0)} KB`)
}

console.error(
  `\ntotal ${(totalBytes / 1024 / 1024).toFixed(2)} MB of fonts, ${(cssBytes / 1024).toFixed(0)} KB of CSS`,
)
