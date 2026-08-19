/**
 * External data sources: metadata, download cache, parsing.
 *
 * This is the single source of truth for attribution -- the README, the /about
 * page and the footer all render from SOURCES, so there is only one list to
 * keep up to date.
 */
import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
export const RAW_DIR = join(ROOT, 'data/raw')
export const DATA_DIR = join(ROOT, 'public/data')
export const FONT_DIR = join(ROOT, 'public/fonts')

/**
 * Copy in every interface language. Written out here rather than in the
 * message files because a source belongs with the rest of its record.
 */
export type Localized = Record<'zh-CN' | 'zh-TW' | 'zh-HK', string>

export interface Source {
  id: string
  /** One line on what it is used for. */
  use: Localized
  name: string
  homepage: string
  license: string
  licenseUrl: string
  /** Upstream standard, or a caveat worth stating. */
  note?: Localized
}

export const SOURCES: Source[] = [
  {
    id: 'source-han',
    use: {
      'zh-CN': '判定四地字形差异',
      'zh-TW': '判定四地字形差異',
      'zh-HK': '判定四地字形差異',
    },
    name: 'Adobe Source Han Sans / Serif（CMap 资源）',
    homepage: 'https://github.com/adobe-fonts/source-han-sans',
    license: 'SIL OFL 1.1',
    licenseUrl: 'https://openfontlicense.org/',
    note: {
      'zh-CN':
        '每套字体的四份地区 CMap 给出「码点 → CID」映射，同一字形池内 CID 相同即同一字形。判定取黑体与宋体的并集。',
      'zh-TW':
        '每套字體的四份地區 CMap 給出「碼位 → CID」對映，同一字形池內 CID 相同即同一字形。判定取黑體與宋體的聯集。',
      'zh-HK':
        '每套字體的四份地區 CMap 給出「碼點 → CID」對應，同一字形池內 CID 相同即同一字形。判定取黑體與宋體的並集。',
    },
  },
  {
    id: 'noto-cjk',
    use: {
      'zh-CN': '页面展示用字体',
      'zh-TW': '頁面顯示用字體',
      'zh-HK': '頁面顯示用字體',
    },
    name: 'Noto Sans CJK / Noto Serif CJK',
    homepage: 'https://github.com/notofonts/noto-cjk',
    license: 'SIL OFL 1.1',
    licenseUrl: 'https://openfontlicense.org/',
    note: {
      'zh-CN':
        '本站字体是按表内用字子集化后的产物，OFL 声明随附于 /fonts/OFL.txt。',
      'zh-TW':
        '本站字體是按表內用字子集化後的產物，OFL 聲明隨附於 /fonts/OFL.txt。',
      'zh-HK':
        '本站字體是按表內用字子集化後的產物，OFL 聲明隨附於 /fonts/OFL.txt。',
    },
  },
  {
    id: 'opencc',
    use: {
      'zh-CN': '简繁、港台异体、日本新旧字体对应',
      'zh-TW': '簡繁、港臺異體、日本新舊字體對應',
      'zh-HK': '簡繁、港台異體、日本新舊字體對應',
    },
    name: 'OpenCC 开放中文转换',
    homepage: 'https://github.com/BYVoid/OpenCC',
    license: 'Apache-2.0',
    licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
  },
  {
    id: 'hanzi-chars',
    use: {
      'zh-CN': '四地标准字表',
      'zh-TW': '四地標準字表',
      'zh-HK': '四地標準字表',
    },
    name: 'zispace/hanzi-chars',
    homepage: 'https://github.com/zispace/hanzi-chars',
    license: '仓库未声明',
    licenseUrl: 'https://github.com/zispace/hanzi-chars',
    note: {
      'zh-CN':
        '转录自各地官方规范：《通用规范汉字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）与《学年別漢字配当表》（2017）。',
      'zh-TW':
        '轉錄自各地官方規範：《通用規範漢字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）與《学年別漢字配当表》（2017）。',
      'zh-HK':
        '轉錄自各地官方規範：《通用規範漢字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）與《学年別漢字配当表》（2017）。',
    },
  },
  {
    id: 'unihan',
    use: {
      'zh-CN': '笔画数、读音',
      'zh-TW': '筆畫數、讀音',
      'zh-HK': '筆畫數、讀音',
    },
    name: 'Unicode Han Database (Unihan)',
    homepage: 'https://www.unicode.org/reports/tr38/',
    license: 'Unicode License v3',
    licenseUrl: 'https://www.unicode.org/license.txt',
  },
  {
    id: 'hanzidb',
    use: {
      'zh-CN': '大陆字频排名',
      'zh-TW': '大陸字頻排名',
      'zh-HK': '大陸字頻排名',
    },
    name: 'hanziDB.csv（Jun Da《现代汉语单字频率列表》）',
    homepage: 'https://github.com/ruddfawcett/hanziDB.csv',
    license: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
  },
]

const gh = (repo: string, ref: string, path: string) =>
  `https://raw.githubusercontent.com/${repo}/${ref}/${path}`

const charList = (name: string) =>
  gh('zispace/hanzi-chars', 'main', `data-charlist/${encodeURIComponent(name)}`)

const openCC = (name: string) =>
  gh('BYVoid/OpenCC', 'master', `data/dictionary/${name}.txt`)

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
}

const noto = (style: 'Sans' | 'Serif', region: string) =>
  gh(
    'notofonts/noto-cjk',
    'main',
    `${style}/OTF/${NOTO_DIR[region]}/Noto${style}CJK${region}-Regular.otf`,
  )

/**
 * Cache path -> download URL. Paths are grouped by what the file is, so
 * data/raw stays legible once it holds a hundred megabytes of downloads.
 */
export const ASSETS: Record<string, string> = {
  'charlist/cn-1.txt': charList('《通用规范汉字表》（2013年）一级字.txt'),
  'charlist/cn-2.txt': charList('《通用规范汉字表》（2013年）二级字.txt'),
  'charlist/cn-3.txt': charList('《通用规范汉字表》（2013年）三级字.txt'),
  'charlist/tw-common.txt': charList('臺灣《常用國字表》（1982年）.txt'),
  'charlist/tw-sub.txt': charList('臺灣《次常用國字表》（1982年）.txt'),
  'charlist/hk-common.txt': charList('香港《常用字表》.txt'),
  'charlist/jp-joyo.txt': charList('日本《常用漢字表》（2010年）.txt'),
  'charlist/jp-grade.txt': charList('日本《学年別漢字配当表》（2017年）.txt'),

  'opencc/STCharacters.txt': openCC('STCharacters'),
  'opencc/TSCharacters.txt': openCC('TSCharacters'),
  'opencc/TWVariants.txt': openCC('TWVariants'),
  'opencc/HKVariants.txt': openCC('HKVariants'),
  'opencc/JPShinjitaiCharacters.txt': openCC('JPShinjitaiCharacters'),

  'cmap/sans-CN.txt': cmap('sans', 'CN'),
  'cmap/sans-HK.txt': cmap('sans', 'HK'),
  'cmap/sans-TW.txt': cmap('sans', 'TW'),
  'cmap/sans-JP.txt': cmap('sans', 'JP'),
  'cmap/serif-CN.txt': cmap('serif', 'CN'),
  'cmap/serif-HK.txt': cmap('serif', 'HK'),
  'cmap/serif-TW.txt': cmap('serif', 'TW'),
  'cmap/serif-JP.txt': cmap('serif', 'JP'),

  'frequency/hanziDB.csv': gh(
    'ruddfawcett/hanziDB.csv',
    'master',
    'data/hanziDB.csv',
  ),
  'unihan/Unihan.zip':
    'https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip',

  'font/NotoSansCJKsc-Regular.otf': noto('Sans', 'sc'),
  'font/NotoSansCJKhk-Regular.otf': noto('Sans', 'hk'),
  'font/NotoSansCJKtc-Regular.otf': noto('Sans', 'tc'),
  'font/NotoSansCJKjp-Regular.otf': noto('Sans', 'jp'),
  'font/NotoSerifCJKsc-Regular.otf': noto('Serif', 'sc'),
  'font/NotoSerifCJKhk-Regular.otf': noto('Serif', 'hk'),
  'font/NotoSerifCJKtc-Regular.otf': noto('Serif', 'tc'),
  'font/NotoSerifCJKjp-Regular.otf': noto('Serif', 'jp'),

  'font/OFL.txt': gh('notofonts/noto-cjk', 'main', 'Sans/LICENSE'),
}

/** Read from the cache, downloading first if needed. */
export async function raw(name: string): Promise<Buffer> {
  const url = ASSETS[name]
  if (!url) throw new Error(`unregistered source: ${name}`)
  const path = join(RAW_DIR, name)
  if (!existsSync(path)) {
    await mkdir(dirname(path), { recursive: true })
    process.stderr.write(`  ↓ ${name}\n`)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`download failed: ${res.status} ${url}`)
    await writeFile(path, Buffer.from(await res.arrayBuffer()))
  }
  return readFile(path)
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

/** Reverse an OpenCC dictionary: regional form -> standard form. First entry
 * wins so later ones cannot clobber it. */
export function reverseDict(dict: Map<string, string[]>): Map<string, string> {
  const rev = new Map<string, string>()
  for (const [key, values] of dict) {
    for (const value of values) {
      if (value !== key && !rev.has(value)) rev.set(value, key)
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
