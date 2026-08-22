import { Buffer } from 'node:buffer'
/**
 * Builds subset woff2 files from the regional Noto CJK faces, in both sans and
 * serif.
 *
 * The five table columns are pinned to their own region's font and never
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
 *
 * The cutting itself is queued rather than run here, and scripts/subset-worker.ts
 * spreads the queue over the cores; see runQueue below for why.
 */
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import { join } from 'node:path'
import { Worker } from 'node:worker_threads'
import * as fontkit from 'fontkit'
import { messages } from '../app/locales/all.ts'
import {
  LOCALE_META,
  localeName,
  LOCALES,
  type Locale,
} from '../app/locales/index.ts'
import { dictLinks, formsOf } from '../shared/links.ts'
import { fontIndexOf } from '../shared/row.ts'
import { SOURCES } from '../shared/sources.ts'
import { REGIONS, STYLES, type CharsData, type Style } from '../shared/types.ts'
import { DATA_DIR, FONT_DIR, NOTICES_DIR, raw, ROOT } from './sources.ts'
import type { SubsetDone, SubsetJob } from './subset-worker.ts'

/** Region code as Noto names it. */
const NOTO: Record<string, string> = {
  cn: 'sc',
  hk: 'hk',
  tw: 'tc',
  jp: 'jp',
  kr: 'kr',
}

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
await mkdir(FONT_DIR, { recursive: true })
for (const name of await readdir(FONT_DIR))
  if (name.endsWith('.woff2')) await unlink(join(FONT_DIR, name))

await mkdir(NOTICES_DIR, { recursive: true })
await writeFile(join(NOTICES_DIR, 'noto-ofl.txt'), await raw('font/OFL.txt'))

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

/**
 * Subsets to cut, in output order. Nothing is compressed while the queue is
 * being built, so the @font-face rules can be written alongside each entry and
 * only the byte counts have to wait.
 */
const jobs: Omit<SubsetJob, 'index'>[] = []
const queue = (job: Omit<SubsetJob, 'index'>): number => jobs.push(job) - 1

/**
 * Cut the queue across every core, and answer with each subset's size.
 *
 * Nearly all of the work is woff2 encoding -- Brotli at quality 11 -- which
 * runs a few hundred milliseconds per chunk against a few milliseconds for the
 * subsetting itself. subset-font puts every call behind a p-limit(1) over one
 * shared wasm heap, so ordering the calls differently in this process would
 * change nothing; the parallelism has to come from separate threads.
 */
async function runQueue(): Promise<number[]> {
  // Workers read from the cache directly, so verify and fetch here first --
  // otherwise they would all race to download the same missing source.
  for (const font of new Set(jobs.map((job) => job.font))) await raw(font)

  const sizes = Array.from({ length: jobs.length }, () => 0)
  const count = Math.min(availableParallelism(), jobs.length)
  console.error(`${jobs.length} subsets over ${count} workers`)

  let next = 0
  let failed = false
  await Promise.all(
    Array.from(
      { length: count },
      () =>
        new Promise<void>((resolve, reject) => {
          const worker = new Worker(
            new URL('subset-worker.ts', import.meta.url),
          )
          const take = () => {
            if (failed || next >= jobs.length) {
              worker.terminate()
              resolve()
              return
            }
            const index = next++
            worker.postMessage({ index, ...jobs[index]! })
          }
          const fail = (error: Error) => {
            failed = true
            worker.terminate()
            reject(error)
          }
          worker.on('message', (done: SubsetDone) => {
            if (done.error) return fail(new Error(done.error))
            sizes[done.index] = done.bytes!
            take()
          })
          worker.on('error', fail)
          take()
        }),
    ),
  )
  return sizes
}

const faces: Record<string, string[]> = { sans: [], serif: [], ui: [] }

/** Queue positions of each style's chunks, for the size report. */
const styleChunks: Record<string, number[]> = { sans: [], serif: [] }

for (const style of STYLES) {
  for (const region of REGIONS) {
    const chars = needed[region]!
    for (let start = 0, index = 0; start < chars.length; start += CHUNK_SIZE) {
      const chunk = chars.slice(start, start + CHUNK_SIZE)
      const file = `hanji-${style}-${region}-${index}.woff2`
      styleChunks[style]!.push(
        queue({ font: otf(style, region), text: chunk.join(''), file }),
      )
      faces[style]!.push(
        `@font-face {
  font-family: 'Hanji ${style === 'sans' ? 'Sans' : 'Serif'} ${region.toUpperCase()}';
  src: url('./${file}') format('woff2');
  font-display: swap;
  unicode-range: ${unicodeRange(chunk)};
}`,
      )
      index++
    }
  }
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

/** Hangul shown on character pages is data rather than interface copy. */
const KOREAN_READINGS = data.rows
  .flatMap((row) => row.readings?.korean ?? [])
  .join('')

/**
 * Everything the interface can render in body type.
 *
 * Besides the message file this has to cover the attribution table (worded in
 * sources.ts), the dictionary names (in links.ts), kana and Korean readings.
 * Anything missed falls through to Google's Noto Sans SC, which is chunked by
 * codepoint range and will happily fetch a dozen chunks for a handful of
 * characters.
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
    KOREAN_READINGS,
  ].join('')
}

const UI_FONT: Record<string, (style: Style) => string> = {
  'zh-CN': (style) => otf(style, 'cn'),
  'zh-TW': (style) => otf(style, 'tw'),
  'zh-HK': (style) => otf(style, 'hk'),
  'ja-JP': (style) => otf(style, 'jp'),
  'ko-KR': (style) => otf(style, 'kr'),
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

const uiSubsets: { index: number; file: string; chars: number }[] = []

for (const locale of Object.keys(messages)) {
  const source = UI_FONT[locale]
  if (!source) continue
  const chars = [...new Set(uiText())].join('')
  for (const style of STYLES) {
    const file = `ui-${style}-${locale}.woff2`
    uiSubsets.push({
      index: queue({ font: source(style), text: chars, file }),
      file,
      chars: chars.length,
    })
    faces.ui!.push(
      `@font-face {
  font-family: '${LOCALE_META[locale as Locale].uiFamily} ${style === 'sans' ? 'Sans' : 'Serif'}';
  src: url('./${file}') format('woff2');
  font-display: swap;
}`,
    )
  }
}

/**
 * Latin, digits and punctuation, cut from faces designed for them.
 *
 * These sit ahead of Google's families in the stack, which is what keeps the
 * page from reaching fonts.gstatic.com at all -- a third-party request that
 * costs a round trip everywhere and simply fails behind the Great Firewall.
 * One file per style rather than one per weight: the faces are variable, and
 * the interface only ever asks for 400 and 500.
 */
const TONE_MARKS = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿüê'

/**
 * Punctuation the templates reach for directly rather than through the
 * message files -- an en dash between the stroke bounds, arrows and ellipses
 * in prose. Missing one costs a whole Google chunk for a single character.
 */
const PUNCTUATION = '–—…‘’“”·×÷→←↑↓•§¶†‡'
const ASCII = Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) =>
  String.fromCodePoint(0x20 + i),
).join('')

const LATIN_SOURCE: Record<Style, string> = {
  sans: 'font/NotoSans-VF.ttf',
  serif: 'font/NotoSerif-VF.ttf',
}

const latinSubsets: { index: number; file: string }[] = []

for (const style of STYLES) {
  const chars = [...new Set(ASCII + TONE_MARKS + PUNCTUATION + uiText())].join(
    '',
  )
  const file = `ui-latin-${style}.woff2`
  latinSubsets.push({
    index: queue({ font: LATIN_SOURCE[style], text: chars, file }),
    file,
  })
  faces.ui!.push(
    `@font-face {
  font-family: 'UI Latin ${style === 'sans' ? 'Sans' : 'Serif'}';
  src: url('./${file}') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}`,
  )
}

// Everything is queued, so cut it all at once and then report the sizes in
// the order the files were declared.
const sizes = await runQueue()

let totalBytes = 0
for (const style of STYLES) {
  const styleBytes = styleChunks[style]!.reduce((sum, i) => sum + sizes[i]!, 0)
  totalBytes += styleBytes
  console.error(`${style}  ${(styleBytes / 1024 / 1024).toFixed(2)} MB`)
}
for (const { index, file, chars } of uiSubsets)
  console.error(
    `${file}  ${chars} chars  ${(sizes[index]! / 1024).toFixed(0)} KB`,
  )
for (const { index, file } of latinSubsets)
  console.error(`${file}  ${(sizes[index]! / 1024).toFixed(0)} KB`)

/**
 * The typeface switch labels itself with 黑 and 宋, each set in the face it
 * names, so the two designs have to be on screen at once -- which no single
 * font file can do. Two glyphs are not worth two requests, so their outlines
 * are lifted here and inlined as SVG instead.
 *
 * Keyed by character across every locale, so a language that labels the
 * switch differently is covered by adding it to the message file.
 */
async function faceMarks(): Promise<string> {
  const marks: Record<string, Record<string, string>> = {}
  // The ideographic em box with the baseline at y=0, which is where these
  // glyphs are drawn; hhea's ascent carries line spacing and would frame them
  // far too loosely.
  const viewBox = '0 -880 1000 1000'
  for (const style of STYLES) {
    for (const locale of Object.keys(messages) as Locale[]) {
      // Each label is drawn in the face it names, and only in that face
      const char = messages[locale].style[style]
      // Labels shared by several locales only need one outline. Locale order
      // keeps the existing Chinese marks on the default face, while unique
      // Japanese and Korean labels come from their respective faces.
      if (marks[style]?.[char]) continue
      const source = UI_FONT[locale]
      if (!source) continue
      const font = fontkit.create(
        Buffer.from(await raw(source(style))),
      ) as fontkit.Font
      const scale = 1000 / font.unitsPerEm
      const glyph = font.glyphForCodePoint(char.codePointAt(0)!)
      ;(marks[style] ??= {})[char] = glyph.path.scale(scale, -scale).toSVG()
    }
  }
  return `/* Generated by scripts/build-fonts.ts -- do not edit.
 * The typeface switch names each face in that face, so both designs are on
 * screen at once and no single font file can serve them. Two glyphs are not
 * worth two requests, so their outlines are inlined instead.
 * Noto Sans CJK / Noto Serif CJK, SIL OFL 1.1.
 */
export const FACE_VIEW_BOX = ${JSON.stringify(viewBox)}

export const FACE_MARKS: Record<string, Record<string, string>> = ${JSON.stringify(marks, undefined, 2)}
`
}

await writeFile(join(ROOT, 'app/generated/face-marks.ts'), await faceMarks())
console.error('app/generated/face-marks.ts')

const banner = `/* Generated by scripts/build-fonts.ts -- do not edit.
 * Noto Sans CJK and Noto Serif CJK (SIL OFL 1.1), subset to the characters
 * this app uses. Licence text is served at /notices/noto-ofl.txt.
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
