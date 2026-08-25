/**
 * External data source downloads, cache management, and parsing.
 */
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import {
  lstat,
  mkdir,
  readdir,
  readFile,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
export const RAW_DIR = join(ROOT, 'data/raw')
export const ASSET_DIR = join(ROOT, 'app/assets')
export const DATA_DIR = join(ASSET_DIR, 'data')
export const STROKE_DIR = join(ASSET_DIR, 'strokes')
export const FONT_DIR = join(ROOT, 'public/fonts')
export const NOTICES_DIR = join(ROOT, 'public/notices')
export const SOURCE_LOCK_PATH = join(ROOT, 'data/sources.lock.json')

const gh = (repo: string, ref: string, path: string) =>
  `https://raw.githubusercontent.com/${repo}/${ref}/${path}`

const charList = (name: string) =>
  gh('zispace/hanzi-chars', 'main', `data-charlist/${encodeURIComponent(name)}`)

const openCC = (name: string) =>
  gh('BYVoid/OpenCC', 'master', `data/dictionary/${name}.txt`)

const animCJK = (path: string) => gh('parsimonhi/animCJK', 'master', path)

const cmap = (repo: 'sans' | 'serif', region: string) =>
  gh(
    `adobe-fonts/source-han-${repo}`,
    'master',
    `UniSourceHan${repo === 'sans' ? 'Sans' : 'Serif'}${region}-UTF32-H`,
  )

const NOTO_DIR: Record<string, string> = {
  sc: 'SimplifiedChinese',
  hk: 'TraditionalChineseHK',
  tc: 'TraditionalChinese',
  jp: 'Japanese',
  kr: 'Korean',
}

const noto = (style: 'Sans' | 'Serif', region: string) =>
  gh(
    'notofonts/noto-cjk',
    'main',
    `${style}/OTF/${NOTO_DIR[region]}/Noto${style}CJK${region}-Regular.otf`,
  )

const latestGitHubRelease = (repo: string, file: string) =>
  `https://github.com/${repo}/releases/latest/download/${file}`

/**
 * Cache path -> moving upstream URL. `pnpm update:sources` resolves these refs
 * to immutable versions and writes their checksums to SOURCE_LOCK_PATH. Builds
 * only download the pinned URLs from that lockfile.
 */
export const ASSET_URLS: Record<string, string> = {
  'charlist/cn-1.txt': charList('《通用规范汉字表》（2013年）一级字.txt'),
  'charlist/cn-2.txt': charList('《通用规范汉字表》（2013年）二级字.txt'),
  'charlist/cn-3.txt': charList('《通用规范汉字表》（2013年）三级字.txt'),
  'charlist/tw-common.txt': charList('臺灣《常用國字表》（1982年）.txt'),
  'charlist/tw-sub.txt': charList('臺灣《次常用國字表》（1982年）.txt'),
  'charlist/hk-common.txt': charList('香港《常用字表》.txt'),
  'charlist/jp-joyo.txt': charList('日本《常用漢字表》（2010年）.txt'),
  'charlist/jp-grade.txt': charList('日本《学年別漢字配当表》（2017年）.txt'),
  'charlist/kr-basic.txt': charList(
    '韩国《漢文教育用基礎漢字》（2000年版）.txt',
  ),

  'opencc/STCharacters.txt': openCC('STCharacters'),
  'opencc/TSCharacters.txt': openCC('TSCharacters'),
  'opencc/TWVariants.txt': openCC('TWVariants'),
  'opencc/HKVariants.txt': openCC('HKVariants'),
  'opencc/JPShinjitaiCharacters.txt': openCC('JPShinjitaiCharacters'),

  'strokes/animcjk-ja.txt': animCJK('graphicsJa.txt'),
  'strokes/animcjk-zh-hans.txt': animCJK('graphicsZhHans.txt'),
  'strokes/animcjk-zh-hant.txt': animCJK('graphicsZhHant.txt'),
  'strokes/animcjk-ko.txt': animCJK('graphicsKo.txt'),
  'strokes/animcjk-APL.txt': animCJK('licenses/APL/english/ARPHICPL.TXT'),
  'strokes/animcjk-COPYING.txt': animCJK('licenses/COPYING.txt'),

  'cmap/sans-CN.txt': cmap('sans', 'CN'),
  'cmap/sans-HK.txt': cmap('sans', 'HK'),
  'cmap/sans-TW.txt': cmap('sans', 'TW'),
  'cmap/sans-JP.txt': cmap('sans', 'JP'),
  'cmap/sans-KR.txt': cmap('sans', 'KR'),
  'cmap/serif-CN.txt': cmap('serif', 'CN'),
  'cmap/serif-HK.txt': cmap('serif', 'HK'),
  'cmap/serif-TW.txt': cmap('serif', 'TW'),
  'cmap/serif-JP.txt': cmap('serif', 'JP'),
  'cmap/serif-KR.txt': cmap('serif', 'KR'),

  'frequency/hanziDB.csv': gh(
    'ruddfawcett/hanziDB.csv',
    'master',
    'data/hanziDB.csv',
  ),
  'frequency/words-hk.csv': 'https://words.hk/faiman/analysis/charcount.csv',
  'frequency/naer-112.xlsx':
    'https://teric.naer.edu.tw/wSite/DoDownload?xmlId=2068770&fileName=1761555949158&format=xlsx',
  'frequency/kanji-frequency-wikipedia.csv': gh(
    'scriptin/kanji-frequency',
    'master',
    'data/wikipedia_characters.csv',
  ),
  'unihan/Unihan.zip':
    'https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip',

  'font/NotoSansCJKsc-Regular.otf': noto('Sans', 'sc'),
  'font/NotoSansCJKhk-Regular.otf': noto('Sans', 'hk'),
  'font/NotoSansCJKtc-Regular.otf': noto('Sans', 'tc'),
  'font/NotoSansCJKjp-Regular.otf': noto('Sans', 'jp'),
  'font/NotoSansCJKkr-Regular.otf': noto('Sans', 'kr'),
  'font/NotoSerifCJKsc-Regular.otf': noto('Serif', 'sc'),
  'font/NotoSerifCJKhk-Regular.otf': noto('Serif', 'hk'),
  'font/NotoSerifCJKtc-Regular.otf': noto('Serif', 'tc'),
  'font/NotoSerifCJKjp-Regular.otf': noto('Serif', 'jp'),
  'font/NotoSerifCJKkr-Regular.otf': noto('Serif', 'kr'),

  'font/PlangothicP1-Regular.ttf': latestGitHubRelease(
    'Fitzgerald-Porthmouth-Koenigsegg/Plangothic_Project',
    'PlangothicP1-Regular.ttf',
  ),
  'font/Plangothic-OFL.txt': gh(
    'Fitzgerald-Porthmouth-Koenigsegg/Plangothic_Project',
    'main',
    'LICENSE-OFL.txt',
  ),
  'font/WenJinMinchoP2-Regular.otf': gh(
    'takushun-wu/WenJinMincho',
    'main',
    'otf/WenJinMinchoP2-Regular.otf',
  ),
  'font/WenJinMincho-OFL.md': gh(
    'takushun-wu/WenJinMincho',
    'main',
    'LICENSE.md',
  ),

  // Latin, digits and punctuation for the interface, plus the tone marks the
  // readings carry. Cut from faces designed for Latin rather than from the
  // CJK families, whose Latin is a compromise.
  'font/NotoSans-VF.ttf': gh(
    'notofonts/notofonts.github.io',
    'main',
    'fonts/NotoSans/unhinted/variable-ttf/NotoSans%5Bwdth,wght%5D.ttf',
  ),
  'font/NotoSansMono-Regular.ttf': gh(
    'notofonts/notofonts.github.io',
    'main',
    'fonts/NotoSansMono/hinted/ttf/NotoSansMono-Regular.ttf',
  ),
  'font/NotoSerif-VF.ttf': gh(
    'notofonts/notofonts.github.io',
    'main',
    'fonts/NotoSerif/unhinted/variable-ttf/NotoSerif%5Bwdth,wght%5D.ttf',
  ),
  'font/OFL.txt': gh('notofonts/noto-cjk', 'main', 'Sans/LICENSE'),
}

export interface LockedAsset {
  url: string
  sha256: string
  size: number
}

export interface SourceLock {
  version: 1
  revisions: Record<string, string>
  assets: Record<string, LockedAsset>
}

let loadedSourceLock: SourceLock | undefined

export function sourceLock(): SourceLock {
  if (loadedSourceLock) return loadedSourceLock
  const lock = JSON.parse(readFileSync(SOURCE_LOCK_PATH, 'utf8')) as SourceLock
  if (lock.version !== 1 || !lock.assets || !lock.revisions)
    throw new Error(`invalid source lock: ${SOURCE_LOCK_PATH}`)
  loadedSourceLock = lock
  return lock
}

export const sha256 = (data: Uint8Array): string =>
  createHash('sha256').update(data).digest('hex')

/** Some institutional download endpoints reject anonymous script clients. */
export function sourceFetchOptions(url: string): RequestInit {
  const headers: Record<string, string> = {
    'User-Agent': 'Hanji data pipeline (+https://github.com/sxzz/hanji)',
  }
  if (new URL(url).hostname === 'teric.naer.edu.tw') {
    headers.Referer =
      'https://teric.naer.edu.tw/wSite/ct?ctNode=645&mp=teric_b&xItem=2068770'
    // This endpoint reports the uncompressed XLSX size even when gzip is
    // negotiated, so strict HTTP clients reject the otherwise complete body.
    headers['Accept-Encoding'] = 'identity'
  }
  return { headers }
}

function lockedAsset(name: string): LockedAsset {
  if (!ASSET_URLS[name]) throw new Error(`unregistered source: ${name}`)
  const asset = sourceLock().assets[name]
  if (!asset) throw new Error(`source missing from lockfile: ${name}`)
  if (!/^https:\/\//.test(asset.url) || !/^[a-f\d]{64}$/.test(asset.sha256))
    throw new Error(`invalid locked source: ${name}`)
  return asset
}

function matchesLock(data: Buffer, asset: LockedAsset): boolean {
  return data.byteLength === asset.size && sha256(data) === asset.sha256
}

let rawCachePrepared: Promise<void> | undefined

/** Drop files restored from an older Actions cache after a source is retired. */
async function prepareRawCache(): Promise<void> {
  if (!existsSync(RAW_DIR)) return
  for (const relativePath of await readdir(RAW_DIR, { recursive: true })) {
    const name = relativePath.split(sep).join('/')
    if (ASSET_URLS[name]) continue
    const path = join(RAW_DIR, relativePath)
    if (!(await lstat(path)).isFile()) continue
    await unlink(path)
    process.stderr.write(`  × ${name}\n`)
  }
}

async function downloadLocked(
  name: string,
  path: string,
  asset: LockedAsset,
): Promise<Buffer> {
  const res = await fetch(asset.url, sourceFetchOptions(asset.url))
  if (!res.ok) throw new Error(`download failed: ${res.status} ${asset.url}`)
  const data = Buffer.from(await res.arrayBuffer())
  if (!matchesLock(data, asset))
    throw new Error(`checksum mismatch for locked source: ${name}`)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, data)
  return data
}

/** Read a verified pinned source from the cache, downloading when necessary. */
export async function raw(name: string): Promise<Buffer> {
  rawCachePrepared ??= prepareRawCache()
  await rawCachePrepared
  const asset = lockedAsset(name)
  const path = join(RAW_DIR, name)
  if (existsSync(path)) {
    const cached = await readFile(path)
    if (matchesLock(cached, asset)) return cached
    process.stderr.write(`  ↻ ${name}\n`)
  } else {
    process.stderr.write(`  ↓ ${name}\n`)
  }
  return downloadLocked(name, path, asset)
}

export async function rawText(name: string): Promise<string> {
  return (await raw(name)).toString('utf8')
}

/**
 * One character per line, `#` starts a comment.
 *
 * The lists are not uniformly formatted. Besides a bare character there are:
 *   台〔臺〕  丟〔丢〕   HK 常用字字形表: primary followed by variants
 *   𠮟﹝叱﹞  塡﹝填﹞   JP 常用漢字表: listed form plus accepted alternative
 *   堔※                TW 次常用國字表 marker
 * Bracketed variants count as common characters in that region too, so every
 * Han character on the line goes into the set.
 */
const HAN = /\p{Script=Han}/gu

export function parseCharList(text: string): string[] {
  const chars: string[] = []
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue
    chars.push(...(line.match(HAN) ?? []))
  }
  return chars
}

/** Variant glosses: 別﹝别﹞ in the Hong Kong table, 剝﹝剥﹞ in the Japanese one. */
const GLOSSED_VARIANT = /〔[^〕]*〕|﹝[^﹞]*﹞/g

/**
 * Only the entries a list carries in its own right.
 *
 * The Hong Kong table glosses variants in 〔〕 and the Japanese one supplements
 * alternate glyph forms in ﹝﹞. Those are one character written another way,
 * not a second entry, so anything asking whether a list treats two characters
 * as distinct has to read past them.
 */
export function parsePrimaryCharList(text: string): string[] {
  return parseCharList(text.replaceAll(GLOSSED_VARIANT, ''))
}

/** OpenCC dictionary: `key<TAB>value1 value2 ...`. */
export function parseDict(text: string): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue
    const tab = line.indexOf('\t')
    if (tab === -1) continue
    const key = line.slice(0, tab)
    const values = line
      .slice(tab + 1)
      .trim()
      .split(' ')
      .filter(Boolean)
    if (key && values.length) map.set(key, values)
  }
  return map
}

/** Reverse an OpenCC dictionary without discarding one-to-many candidates. */
export function reverseDict(
  dict: Map<string, string[]>,
): Map<string, string[]> {
  const rev = new Map<string, string[]>()
  for (const [key, values] of dict) {
    for (const value of values) {
      if (value === key) continue
      const candidates = rev.get(value) ?? []
      if (!candidates.includes(key)) candidates.push(key)
      rev.set(value, candidates)
    }
  }
  return rev
}

export interface Readings {
  /** Mandarin, all readings a polyphone has. */
  mandarin?: string[]
  /** Cantonese, Jyutping. */
  cantonese?: string[]
  /** Japanese on'yomi, in katakana. */
  on?: string[]
  /** Japanese kun'yomi, in hiragana. */
  kun?: string[]
  /** Modern Korean readings, in Hangul. */
  korean?: string[]
}

export interface UnihanEntry {
  strokes?: number[]
  /** kAlternateTotalStrokes, keyed by IRG source letter. */
  altStrokes?: Record<string, number>
  /** Total strokes of the Adobe-Japan1-6 glyph, i.e. the Japanese form. */
  adobeStrokes?: number
  readings?: Readings
}

const UNIHAN_FIELDS = new Set([
  'kTotalStrokes',
  // Stroke counts that are specific to one IRG source, in the two forms
  // Unihan offers them; see strokesOf in build-data.ts for how they combine.
  'kAlternateTotalStrokes',
  'kRSAdobe_Japan1_6',
  // kMandarin deliberately carries only the most frequent reading, so 重 comes
  // back as zhòng alone. The dictionary fields keep every reading a polyphone
  // has; kTGHZ2013 is the 2013 standard, the same family as the mainland
  // character list, with the 1983 one as fallback.
  'kTGHZ2013',
  'kXHC1983',
  'kMandarin',
  'kCantonese',
  'kJapanese',
  // kHangul is the recommended modern Korean property. kKorean contains Yale
  // romanization and UAX #38 discourages its use.
  'kHangul',
])

/** Dictionary readings come as `page.entry:reading`, sometimes several. */
function pronunciations(value: string): string[] {
  const out: string[] = []
  for (const token of value.trim().split(' ')) {
    const reading = token.includes(':')
      ? token.slice(token.indexOf(':') + 1)
      : token
    for (const one of reading.split(','))
      if (one && !out.includes(one)) out.push(one)
  }
  return out
}

/** kHangul tokens are `reading:sources`; sources describe provenance only. */
function hangulPronunciations(value: string): string[] {
  const out: string[] = []
  for (const token of value.trim().split(' ')) {
    const colon = token.indexOf(':')
    const reading = (colon === -1 ? token : token.slice(0, colon)).normalize(
      'NFC',
    )
    if (reading && !out.includes(reading)) out.push(reading)
  }
  return out
}

const KATAKANA = /^[\u{30A0}-\u{30FF}]/u

/**
 * kAlternateTotalStrokes lists only the IRG sources whose count differs from
 * kTotalStrokes: `12:JK` means Japan and Korea write it in twelve strokes.
 * A lone `-` means every source agrees with kTotalStrokes.
 */
function alternateStrokes(value: string): Record<string, number> | undefined {
  const out: Record<string, number> = {}
  for (const entry of value.trim().split(' ')) {
    const [count, sources] = entry.split(':', 2)
    const total = Number(count)
    if (!sources || !Number.isFinite(total)) continue
    for (const source of sources) out[source] = total
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * kRSAdobe_Japan1_6 analyzes the glyph Adobe-Japan1-6 holds for the codepoint:
 * `C+3237+37.3.5` is CID 3237 filed under radical 37, the radical drawn in 3
 * strokes and 5 more besides, so eight in total. A codepoint often carries
 * several entries -- the same glyph filed under a second radical, or a `V`
 * variant form the codepoint does not directly encode -- so only the `C`
 * entries count, and they have to agree before the number means anything.
 */
const ADOBE_ENTRY = /^C\+\d{1,5}\+\d{1,3}\.(\d{1,2})\.(\d{1,2})$/

function adobeJapanStrokes(value: string): number | undefined {
  let total: number | undefined
  for (const entry of value.trim().split(' ')) {
    const match = ADOBE_ENTRY.exec(entry)
    if (!match) continue
    const sum = Number(match[1]) + Number(match[2])
    if (total === undefined) total = sum
    else if (total !== sum) return undefined
  }
  return total
}

/** Only pull the fields we need instead of holding 40MB in memory. */
export async function loadUnihan(): Promise<Map<number, UnihanEntry>> {
  const zip = unzipSync(new Uint8Array(await raw('unihan/Unihan.zip')), {
    filter: (f) =>
      f.name === 'Unihan_IRGSources.txt' ||
      f.name === 'Unihan_Readings.txt' ||
      f.name === 'Unihan_DictionaryLikeData.txt' ||
      f.name === 'Unihan_RadicalStrokeCounts.txt',
  })
  const out = new Map<number, UnihanEntry>()
  const decoder = new TextDecoder()
  const mandarin = new Map<number, Record<string, string[]>>()

  for (const bytes of Object.values(zip)) {
    for (const line of decoder.decode(bytes).split('\n')) {
      if (!line || line.startsWith('#')) continue
      const [cpText, field, value] = line.split('\t', 3)
      if (!cpText || !field || !value || !UNIHAN_FIELDS.has(field)) continue
      const cp = Number.parseInt(cpText.slice(2), 16)
      let entry = out.get(cp)
      if (!entry) out.set(cp, (entry = {}))

      if (field === 'kTotalStrokes') {
        entry.strokes = value.trim().split(' ').map(Number)
        continue
      }
      if (field === 'kAlternateTotalStrokes') {
        entry.altStrokes = alternateStrokes(value)
        continue
      }
      if (field === 'kRSAdobe_Japan1_6') {
        entry.adobeStrokes = adobeJapanStrokes(value)
        continue
      }

      const readings = (entry.readings ??= {})
      switch (field) {
        case 'kCantonese': {
          readings.cantonese = pronunciations(value)
          break
        }
        case 'kJapanese': {
          // On'yomi is written in katakana and kun'yomi in hiragana, which is
          // the only separation this field offers.
          const tokens = value.trim().split(' ')
          const on = tokens.filter((t) => KATAKANA.test(t))
          const kun = tokens.filter((t) => !KATAKANA.test(t))
          if (on.length) readings.on = on
          if (kun.length) readings.kun = kun
          break
        }
        case 'kHangul': {
          readings.korean = hangulPronunciations(value)
          break
        }
        default: {
          const byField = mandarin.get(cp) ?? {}
          byField[field] = pronunciations(value)
          mandarin.set(cp, byField)
        }
      }
    }
  }

  // Prefer the 2013 standard, then the 1983 dictionary, then the single
  // most-frequent reading
  for (const [cp, byField] of mandarin) {
    const readings = byField.kTGHZ2013 ?? byField.kXHC1983 ?? byField.kMandarin
    if (readings?.length) (out.get(cp)!.readings ??= {}).mandarin = readings
  }
  return out
}

/** hanziDB.csv -> character -> frequency rank. */
export function parseFrequency(text: string): Map<string, number> {
  const map = new Map<string, number>()
  const lines = text.split('\n').slice(1)
  for (const line of lines) {
    if (!line.trim()) continue
    // Only the first two columns matter, and definition contains commas and
    // quotes, so the line cannot simply be split
    const first = line.indexOf(',')
    const second = line.indexOf(',', first + 1)
    const rank = Number(line.slice(0, first))
    const char = line.slice(first + 1, second)
    if (char.length === 1 && Number.isFinite(rank) && !map.has(char))
      map.set(char, rank)
  }
  return map
}

/** Minimal RFC 4180 reader, including quoted commas and embedded newlines. */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index++) {
    const char = text[index]!
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"'
          index++
        } else quoted = false
      } else cell += char
      continue
    }

    switch (char) {
      case '"': {
        quoted = true
        break
      }
      case ',': {
        row.push(cell)
        cell = ''
        break
      }
      case '\n':
      case '\r': {
        if (char === '\r' && text[index + 1] === '\n') index++
        row.push(cell)
        rows.push(row)
        row = []
        cell = ''
        break
      }
      default: {
        cell += char
      }
    }
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

const HAN_CHARACTER = /^\p{Script=Han}$/u

/** Counts -> 1-based competition rank, limited to single Han characters. */
export function rankCharacterCounts(
  entries: Iterable<readonly [string, number]>,
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const [char, count] of entries) {
    if (!HAN_CHARACTER.test(char) || !Number.isSafeInteger(count) || count <= 0)
      continue
    counts.set(char, (counts.get(char) ?? 0) + count)
  }

  const ranked = [...counts].toSorted(
    ([leftChar, leftCount], [rightChar, rightCount]) =>
      rightCount - leftCount ||
      leftChar.codePointAt(0)! - rightChar.codePointAt(0)!,
  )
  const out = new Map<string, number>()
  let previousCount: number | undefined
  let rank = 0
  for (const [index, [char, count]] of ranked.entries()) {
    if (count !== previousCount) rank = index + 1
    out.set(char, rank)
    previousCount = count
  }
  return out
}

/** A CSV count table -> Han character -> normalized frequency rank. */
export function parseCountFrequencyCsv(
  text: string,
  charColumn: number,
  countColumn: number,
): Map<string, number> {
  return rankCharacterCounts(
    parseCsvRows(text).map(
      (row) => [row[charColumn] ?? '', Number(row[countColumn])] as const,
    ),
  )
}

function decodeXml(text: string): string {
  const named: Record<string, string> = {
    '&amp;': '&',
    '&apos;': "'",
    '&gt;': '>',
    '&lt;': '<',
    '&quot;': '"',
  }
  return text.replaceAll(
    /&(?:amp|apos|gt|lt|quot|#\d+|#x[\da-f]+);/gi,
    (entity) => {
      if (named[entity]) return named[entity]
      const hex = entity[2]?.toLowerCase() === 'x'
      const value = Number.parseInt(
        entity.slice(hex ? 3 : 2, -1),
        hex ? 16 : 10,
      )
      return Number.isFinite(value) ? String.fromCodePoint(value) : entity
    },
  )
}

const xmlAttribute = (tag: string, name: string): string | undefined =>
  decodeXml(
    new RegExp(String.raw`(?:^|\s)${name}="([^"]*)"`).exec(tag)?.[1] ?? '',
  ) || undefined

/**
 * NAER's workbook -> Han character -> normalized frequency rank.
 *
 * The workbook contains ten sheets. The combined 2023 corpus sheet is found
 * by name rather than position, then its character and count columns are read
 * from the underlying OOXML so the data build needs no spreadsheet runtime.
 */
export function parseTaiwanFrequency(data: Uint8Array): Map<string, number> {
  const zip = unzipSync(data)
  const decoder = new TextDecoder()
  const read = (path: string): string => {
    const file = zip[path]
    if (!file) throw new Error(`Taiwan frequency workbook missing ${path}`)
    return decoder.decode(file)
  }

  const workbook = read('xl/workbook.xml')
  const sheetTag = [...workbook.matchAll(/<sheet\b[^>]*>/g)]
    .map((match) => match[0])
    .find((tag) => xmlAttribute(tag, 'name') === '112年語料字頻表')
  const relationId = sheetTag && xmlAttribute(sheetTag, 'r:id')
  if (!relationId)
    throw new Error('Taiwan frequency workbook missing combined corpus sheet')

  const relationships = read('xl/_rels/workbook.xml.rels')
  const relationTag = [...relationships.matchAll(/<Relationship\b[^>]*>/g)]
    .map((match) => match[0])
    .find((tag) => xmlAttribute(tag, 'Id') === relationId)
  const target = relationTag && xmlAttribute(relationTag, 'Target')
  if (!target)
    throw new Error('Taiwan frequency workbook has no combined sheet target')

  const sharedStrings = [
    ...read('xl/sharedStrings.xml').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g),
  ].map((match) =>
    [...match[1]!.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
      .map((part) => decodeXml(part[1]!))
      .join(''),
  )

  const sheetPath = target.startsWith('/')
    ? target.slice(1)
    : `xl/${target.replace(/^\.\//, '')}`
  const counts: [string, number][] = []
  for (const row of read(sheetPath).matchAll(
    /<row\b[^>]*>([\s\S]*?)<\/row>/g,
  )) {
    const values: Record<string, string> = {}
    for (const cell of row[1]!.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const reference = xmlAttribute(cell[1]!, 'r')
      const column = /^[A-Z]+/.exec(reference ?? '')?.[0]
      const rawValue = /<v>([\s\S]*?)<\/v>/.exec(cell[2]!)?.[1]
      if (!column || rawValue === undefined) continue
      values[column] =
        xmlAttribute(cell[1]!, 't') === 's'
          ? (sharedStrings[Number(rawValue)] ?? '')
          : decodeXml(rawValue)
    }
    counts.push([values.B ?? '', Number(values.C)])
  }
  return rankCharacterCounts(counts)
}
