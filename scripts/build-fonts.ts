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
  LOCALE_DICTIONARY_REGION,
  LOCALE_META,
  localeName,
  LOCALES,
  type Locale,
} from '../app/locales/index.ts'
import { dictLinks, formsOf } from '../shared/links.ts'
import { LIST_PAGE_SIZE } from '../shared/listings.ts'
import { fontIndexOf, usesSupplementalFont } from '../shared/row.ts'
import { SOURCES } from '../shared/sources.ts'
import {
  FREQUENCY_REGIONS,
  REGIONS,
  STYLES,
  type CharsData,
  type Style,
} from '../shared/types.ts'
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

const SUPPLEMENTAL_FONT: Record<Style, string> = {
  sans: 'font/PlangothicP1-Regular.ttf',
  serif: 'font/WenJinMinchoP2-Regular.otf',
}

const SUPPLEMENTAL_FAMILY: Record<Style, string> = {
  sans: 'Hanji Rare Sans',
  serif: 'Hanji Rare Serif',
}

/**
 * The first shard holds the first list page under every frequency corpus,
 * plus room for their regional forms and the hero. Later shards are requested
 * only as the reader pages or changes sort order.
 */
const DISPLAY_CHUNK_SIZE = LIST_PAGE_SIZE * (FREQUENCY_REGIONS.length + 2)

/** Reading data is sparse on any one detail page, so keep its fallback shards
 * small without multiplying the route-copy font requests. */
const UI_READING_CHUNK_SIZE = 200

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
await Promise.all([
  writeFile(join(NOTICES_DIR, 'noto-ofl.txt'), await raw('font/OFL.txt')),
  writeFile(
    join(NOTICES_DIR, 'plangothic-ofl.txt'),
    await raw('font/Plangothic-OFL.txt'),
  ),
  writeFile(
    join(NOTICES_DIR, 'wenjin-mincho-ofl.md'),
    await raw('font/WenJinMincho-OFL.md'),
  ),
])

/** Collect the characters each region needs, in display-priority order. */
const needed = Object.fromEntries(
  STYLES.map((style) => [
    style,
    Object.fromEntries(REGIONS.map((region) => [region, [] as string[]])),
  ]),
) as Record<Style, Record<(typeof REGIONS)[number], string[]>>
const seen = Object.fromEntries(
  STYLES.map((style) => [
    style,
    Object.fromEntries(REGIONS.map((region) => [region, new Set<string>()])),
  ]),
) as Record<Style, Record<(typeof REGIONS)[number], Set<string>>>
const supplementalNeeded = Object.fromEntries(
  STYLES.map((style) => [style, [] as string[]]),
) as Record<Style, string[]>
const supplementalSeen = Object.fromEntries(
  STYLES.map((style) => [style, new Set<string>()]),
) as Record<Style, Set<string>>

const need = (style: Style, region: (typeof REGIONS)[number], char: string) => {
  if (seen[style][region].has(char)) return
  seen[style][region].add(char)
  needed[style][region].push(char)
}

const supplement = (style: Style, char: string) => {
  if (supplementalSeen[style].has(char)) return
  supplementalSeen[style].add(char)
  supplementalNeeded[style].push(char)
}

const collect = (row: (typeof data.rows)[number]) => {
  for (const style of STYLES) {
    for (let i = 0; i < REGIONS.length; i++) {
      const column = REGIONS[i]!
      if (usesSupplementalFont(row, column, style)) {
        supplement(style, row.chars[i]!)
        continue
      }
      need(style, REGIONS[fontIndexOf(row, i)]!, row.chars[i]!)
    }
    // The Japanese column also shows kyujitai, which has no group to share
    // with.
    if (row.old) {
      if (usesSupplementalFont(row, 'old', style))
        supplement(style, row.old.char)
      else need(style, 'jp', row.old.char)
    }
    // A key or merged-in name the columns never show still appears on the
    // character page, next to the references that look it up.
    for (const form of formsOf(row)) {
      if (form.column && usesSupplementalFont(row, form.column, style))
        supplement(style, form.char)
      else need(style, form.font, form.char)
    }
  }
}

/**
 * The table can sort by any of the four regional frequency corpora. Raw row
 * order cannot stand in for that priority: merged rows such as 箇 and 幷 have
 * very common mainland forms but deliberately live much later in the dataset.
 * Putting a row at its best observed rank keeps every region's first frequency
 * page together at the front of each font instead of pulling distant chunks.
 * Stable sorting preserves dataset order for equal and unranked rows.
 */
const bestFrequencyRank = (row: (typeof data.rows)[number]): number =>
  Math.min(
    ...(row.freq?.filter((rank): rank is number => rank !== null) ?? []),
    Number.MAX_SAFE_INTEGER,
  )

const hero = data.rows.find((row) => row.key === HERO_KEY)
if (hero) collect(hero)
for (const row of data.rows.toSorted(
  (a, b) => bestFrequencyRank(a) - bestFrequencyRank(b),
))
  collect(row)

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
const criticalFaces: string[] = []

/** Queue positions of each style's chunks, for the size report. */
const styleChunks: Record<string, number[]> = { sans: [], serif: [] }

for (const style of STYLES) {
  for (const region of REGIONS) {
    const chars = needed[style][region]
    for (
      let start = 0, index = 0;
      start < chars.length;
      start += DISPLAY_CHUNK_SIZE
    ) {
      const chunk = chars.slice(start, start + DISPLAY_CHUNK_SIZE)
      const file = `hanji-${style}-${region}-${index}.woff2`
      styleChunks[style]!.push(
        queue({ font: otf(style, region), text: chunk.join(''), file }),
      )
      const rule = `@font-face {
  font-family: 'Hanji ${style === 'sans' ? 'Sans' : 'Serif'} ${region.toUpperCase()}';
  src: url('./${file}') format('woff2');
  font-display: swap;
  unicode-range: ${unicodeRange(chunk)};
}`
      // Every initially visible home-row/hero glyph lives in shard zero, as
      // do common detail-page glyphs. Discover those fonts before paint; the
      // much larger catalog of later shards can arrive asynchronously.
      if (index === 0) criticalFaces.push(rule)
      else faces[style]!.push(rule)
      index++
    }
  }
}

/**
 * Source Han/Noto can omit explicit mapping targets in the current data. Keep
 * them as real Unicode text and provide one small face per style instead of
 * depending on an unknown system-font fallback chain. The source font must
 * cover every dynamically collected target or the build fails above output.
 */
for (const style of STYLES) {
  const chars = supplementalNeeded[style]
  if (chars.length === 0) continue

  const source = fontkit.create(
    Buffer.from(await raw(SUPPLEMENTAL_FONT[style])),
  ) as fontkit.Font
  const missing = chars.filter(
    (char) => source.glyphForCodePoint(char.codePointAt(0)!).id === 0,
  )
  if (missing.length > 0)
    throw new Error(
      `${SUPPLEMENTAL_FONT[style]} does not cover supplemental characters: ${missing.join(' ')}`,
    )

  const file = `hanji-rare-${style}.woff2`
  styleChunks[style]!.push(
    queue({
      font: SUPPLEMENTAL_FONT[style],
      text: chars.join(''),
      file,
      names:
        style === 'sans'
          ? {
              family: 'HJS',
              fullName: 'HJS',
              postscriptName: 'HJS',
            }
          : {
              family: 'HJR',
              fullName: 'HJR',
              postscriptName: 'HJR',
            },
    }),
  )
  criticalFaces.push(
    `@font-face {
  font-family: '${SUPPLEMENTAL_FAMILY[style]}';
  src: url('./${file}') format('woff2');
  font-display: block;
  unicode-range: ${unicodeRange(chars)};
}`,
  )
}

/**
 * The interface copy gets the same treatment as the table.
 *
 * Google's Noto Sans SC is chunked by codepoint range, so the few hundred Han
 * characters of interface copy would otherwise pull a dozen upstream chunks
 * and several hundred KB. Local unicode-range chunks keep the first page
 * small while still putting complete self-hosted coverage ahead of the Google
 * family. Each UI family is cut from its regional font, which is also what
 * keeps the interface from displaying the wrong regional glyphs. Locales
 * that deliberately share a UI family contribute copy to the same subsets.
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

const uiFont = (locale: Locale, style: Style): string =>
  otf(style, LOCALE_DICTIONARY_REGION[locale])

/** One generated CJK subset family per distinct interface fallback family. */
const UI_FONT_LOCALES = LOCALES.filter(
  (locale, index) =>
    LOCALES.findIndex(
      (candidate) =>
        LOCALE_META[candidate].uiFamily === LOCALE_META[locale].uiFamily,
    ) === index,
)

/**
 * Group interface characters by where they can appear. Unicode ranges within
 * one family are disjoint, so the home page asks only for shared and home copy
 * instead of downloading the prose for About, every character-page label,
 * and hundreds of possible readings. Switching locale changes the family and
 * naturally requests that locale's matching groups.
 */
const sample = data.rows[0]!
const DICTIONARY_NAMES = dictLinks(sample.chars[0]!)
  .map((link) => link.name)
  .join('')
const LOCALE_NAMES = LOCALES.map(localeName).join('')

const sourceSummary = (locale: Locale): string =>
  SOURCES.flatMap((source) => [
    source.use[locale],
    source.localizedName?.[locale] ?? source.name,
    source.localizedLicense?.[locale] ?? source.license,
  ]).join('')

const sourceNotes = (locale: Locale): string =>
  SOURCES.map((source) => source.note?.[locale] ?? '').join('')

function uiTextGroups(locale: Locale): string[] {
  const message = messages[locale]
  return [
    JSON.stringify({
      meta: message.meta,
      region: message.region,
      nav: message.nav,
      error: message.error,
      options: message.options,
      style: message.style,
      pwa: message.pwa,
      footer: message.footer,
      sourceHeaders: [
        message.about.use,
        message.about.source,
        message.about.license,
      ],
    }) + LOCALE_NAMES,
    JSON.stringify({
      hero: message.hero,
      filter: message.filter,
      sort: message.sort,
      table: message.table,
    }) + sourceSummary(locale),
    JSON.stringify(message.char) + DICTIONARY_NAMES,
    JSON.stringify(message.about) + sourceNotes(locale),
    KANA,
    KOREAN_READINGS,
  ]
}

/** Merge copy from locales that deliberately share one CJK UI family. */
function uiFamilyTextGroups(locale: Locale): string[] {
  const family = LOCALE_META[locale].uiFamily
  const groups = LOCALES.filter(
    (candidate) => LOCALE_META[candidate].uiFamily === family,
  ).map(uiTextGroups)
  return groups[0]!.map((_, index) =>
    groups.map((group) => group[index]!).join(''),
  )
}

/** Everything that can reach the Latin face, across lazy-loaded locales. */
const uiText = (): string =>
  LOCALES.flatMap((locale) => uiTextGroups(locale)).join('')

const uiSubsets: { index: number; file: string; chars: number }[] = []

for (const locale of UI_FONT_LOCALES) {
  const seen = new Set<string>()
  const groups = uiFamilyTextGroups(locale).flatMap((text, groupIndex) => {
    const chars = [...new Set(text)].filter((char) => !seen.has(char))
    for (const char of chars) seen.add(char)
    if (groupIndex < 4) return chars.length ? [chars] : []

    const chunks: string[][] = []
    for (let start = 0; start < chars.length; start += UI_READING_CHUNK_SIZE)
      chunks.push(chars.slice(start, start + UI_READING_CHUNK_SIZE))
    return chunks
  })

  for (const style of STYLES) {
    for (const [chunkIndex, chunk] of groups.entries()) {
      const file = `ui-${style}-${locale}-${chunkIndex}.woff2`
      uiSubsets.push({
        index: queue({
          font: uiFont(locale, style),
          text: chunk.join(''),
          file,
        }),
        file,
        chars: chunk.length,
      })
      const rule = `@font-face {
  font-family: '${LOCALE_META[locale as Locale].uiFamily} ${style === 'sans' ? 'Sans' : 'Serif'}';
  src: url('./${file}') format('woff2');
  font-display: optional;
  unicode-range: ${unicodeRange(chunk)};
}`
      // The default sans copy used by prerendered pages is discovered before
      // paint. Other languages/styles are optional: slow connections keep a
      // correctly regional system fallback instead of delaying the page.
      if (locale === 'zh-CN' && style === 'sans' && chunkIndex < 4)
        criticalFaces.push(rule)
      else faces.ui!.push(rule)
    }
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
  const rule = `@font-face {
  font-family: 'UI Latin ${style === 'sans' ? 'Sans' : 'Serif'}';
  src: url('./${file}') format('woff2');
  font-weight: 100 900;
  font-display: optional;
}`
  if (style === 'sans') criticalFaces.push(rule)
  else faces.ui!.push(rule)
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
      const source =
        locale === 'en-US' ? LATIN_SOURCE[style] : uiFont(locale, style)
      const font = fontkit.create(
        Buffer.from(await raw(source)),
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

const banners: Record<string, string> = {
  critical: `/* Generated by scripts/build-fonts.ts -- do not edit.
 * Paint-critical Noto CJK comparison and default-interface subsets (SIL OFL
 * 1.1). Remaining unicode ranges and optional faces load asynchronously.
 * Licence text is served at /notices/noto-ofl.txt.
 */`,
  ui: `/* Generated by scripts/build-fonts.ts -- do not edit.
 * Noto Sans CJK and Noto Serif CJK (SIL OFL 1.1), subset to the characters
 * this app uses. Licence text is served at /notices/noto-ofl.txt.
 */`,
  sans: `/* Generated by scripts/build-fonts.ts -- do not edit.
 * Noto Sans CJK plus a data-driven Plangothic P1 supplement, both under SIL
 * OFL 1.1. Notices: /notices/noto-ofl.txt and /notices/plangothic-ofl.txt.
 */`,
  serif: `/* Generated by scripts/build-fonts.ts -- do not edit.
 * Noto Serif CJK plus a data-driven WenJin Mincho P2 supplement, both under
 * SIL OFL 1.1. Notices: /notices/noto-ofl.txt and
 * /notices/wenjin-mincho-ofl.md.
 */`,
}

// Critical rules are a small blocking sheet. The remaining sans/UI rules load
// asynchronously, while deferred serif rules wait until a reader asks for it.
let cssBytes = 0
const criticalCss = `${banners.critical}\n\n${criticalFaces.join('\n\n')}\n`
await writeFile(join(FONT_DIR, 'fonts-critical.css'), criticalCss)
cssBytes += criticalCss.length
console.error(
  `fonts-critical.css  ${(criticalCss.length / 1024).toFixed(0)} KB`,
)
for (const [name, rules] of Object.entries(faces)) {
  const css = `${banners[name]}\n\n${rules.join('\n\n')}\n`
  await writeFile(join(FONT_DIR, `fonts-${name}.css`), css)
  cssBytes += css.length
  console.error(`fonts-${name}.css  ${(css.length / 1024).toFixed(0)} KB`)
}

console.error(
  `\ntotal ${(totalBytes / 1024 / 1024).toFixed(2)} MB of fonts, ${(cssBytes / 1024).toFixed(0)} KB of CSS`,
)
