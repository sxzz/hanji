/**
 * External data sources: metadata, download cache, parsing.
 *
 * This is the single source of truth for attribution -- the README, the /about
 * page and the footer all render from SOURCES, so there is only one list to
 * keep up to date.
 */
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'
import type { Locale } from '../app/locales/index.ts'

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
export const RAW_DIR = join(ROOT, 'data/raw')
export const DATA_DIR = join(ROOT, 'public/data')
export const FONT_DIR = join(ROOT, 'public/fonts')
export const SOURCE_LOCK_PATH = join(ROOT, 'data/sources.lock.json')

/**
 * Copy in every interface language. Written out here rather than in the
 * message files because a source belongs with the rest of its record.
 */
export type Localized = Record<Locale, string>

export interface Source {
  id: string
  /** One line on what it is used for. */
  use: Localized
  name: string
  /** Language-specific replacement when the source name itself has copy. */
  localizedName?: Partial<Localized>
  homepage: string
  license: string
  /** Language-specific replacement for a prose license label. */
  localizedLicense?: Partial<Localized>
  licenseUrl: string
  /** Upstream standard, or a caveat worth stating. */
  note?: Localized
}

export const SOURCES: Source[] = [
  {
    id: 'source-han',
    use: {
      'zh-CN': '判定五地字形差异',
      'zh-TW': '判定五地字形差異',
      'zh-HK': '判定五地字形差異',
      'ja-JP': '5地域の字形差を判定',
      'ko-KR': '다섯 지역의 자형 차이 판정',
    },
    name: 'Adobe Source Han Sans / Serif（CMap 资源）',
    localizedName: {
      'ja-JP': 'Adobe Source Han Sans / Serif（CMapリソース）',
      'ko-KR': 'Adobe Source Han Sans / Serif(CMap 리소스)',
    },
    homepage: 'https://github.com/adobe-fonts/source-han-sans',
    license: 'SIL OFL 1.1',
    licenseUrl: 'https://openfontlicense.org/',
    note: {
      'zh-CN':
        '每套字体的五份地区 CMap 给出「码点 → CID」映射，同一字形池内 CID 相同即同一字形。判定取黑体与宋体的并集。',
      'zh-TW':
        '每套字體的五份地區 CMap 給出「碼位 → CID」對映，同一字形池內 CID 相同即同一字形。判定取黑體與宋體的聯集。',
      'zh-HK':
        '每套字體的五份地區 CMap 給出「碼點 → CID」對應，同一字形池內 CID 相同即同一字形。判定取黑體與宋體的並集。',
      'ja-JP':
        '各書体の5地域向けCMapには「コードポイント → CID」の対応があり、同じ字形プール内でCIDが同じなら同一字形です。判定にはゴシック体と明朝体の和集合を使います。',
      'ko-KR':
        '각 글꼴의 다섯 지역용 CMap은 ‘코드 포인트 → CID’ 매핑을 제공합니다. 같은 자형 풀에서 CID가 같으면 같은 자형입니다. 판정에는 고딕체와 명조체의 합집합을 사용합니다.',
    },
  },
  {
    id: 'noto-cjk',
    use: {
      'zh-CN': '页面展示用字体',
      'zh-TW': '頁面顯示用字體',
      'zh-HK': '頁面顯示用字體',
      'ja-JP': '画面表示用フォント',
      'ko-KR': '화면 표시용 글꼴',
    },
    name: 'Noto Sans / Noto Serif（含 CJK）',
    localizedName: {
      'ja-JP': 'Noto Sans / Noto Serif（CJK対応）',
      'ko-KR': 'Noto Sans / Noto Serif(CJK 지원)',
    },
    homepage: 'https://github.com/notofonts/noto-cjk',
    license: 'SIL OFL 1.1',
    licenseUrl: 'https://openfontlicense.org/',
    note: {
      'zh-CN':
        '汉字取自 CJK 版本，拉丁字母与数字取自拉丁版本，都按站内用字子集化后自托管，OFL 声明随附于 /fonts/OFL.txt。',
      'zh-TW':
        '漢字取自 CJK 版本，拉丁字母與數字取自拉丁版本，都按站內用字子集化後自行託管，OFL 聲明隨附於 /fonts/OFL.txt。',
      'zh-HK':
        '漢字取自 CJK 版本，拉丁字母與數字取自拉丁版本，都按站內用字子集化後自行託管，OFL 聲明隨附於 /fonts/OFL.txt。',
      'ja-JP':
        '漢字はCJK版、ラテン文字と数字はラテン版を使用し、サイト内で使う文字だけにサブセット化してセルフホストしています。OFLの表記は/fonts/OFL.txtに同梱しています。',
      'ko-KR':
        '한자는 CJK 버전, 라틴 문자와 숫자는 라틴 버전을 사용합니다. 사이트에서 쓰는 문자만 서브셋으로 만들어 자체 호스팅하며, OFL 고지문은 /fonts/OFL.txt에 함께 제공합니다.',
    },
  },
  {
    id: 'opencc',
    use: {
      'zh-CN': '简繁、港台异体、日本新旧字体对应',
      'zh-TW': '簡繁、港臺異體、日本新舊字體對應',
      'zh-HK': '簡繁、港台異體、日本新舊字體對應',
      'ja-JP': '簡体字・繁体字、香港・台湾の異体字、日本の新字体・旧字体の対応',
      'ko-KR': '간체·번체, 홍콩·대만 이체자, 일본 신자체·구자체 대응',
    },
    name: 'OpenCC 开放中文转换',
    localizedName: {
      'ja-JP': 'OpenCC（Open Chinese Convert）',
      'ko-KR': 'OpenCC(Open Chinese Convert)',
    },
    homepage: 'https://github.com/BYVoid/OpenCC',
    license: 'Apache-2.0',
    licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
  },
  {
    id: 'kanjivg',
    use: {
      'zh-CN': '日本字形笔顺动画',
      'zh-TW': '日本字形筆順動畫',
      'zh-HK': '日本字形筆順動畫',
      'ja-JP': '日本字形の筆順アニメーション',
      'ko-KR': '일본 자형 필순 애니메이션',
    },
    name: 'KanjiVG',
    homepage: 'https://kanjivg.tagaini.net/',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    note: {
      'zh-CN':
        '使用 KanjiVG 的日本字形路径；不改变笔画形状，只按原笔次序着色播放。',
      'zh-TW':
        '使用 KanjiVG 的日本字形路徑；不改變筆畫形狀，只按原筆次序著色播放。',
      'zh-HK':
        '使用 KanjiVG 的日本字形路徑；不改變筆畫形狀，只按原筆次序着色播放。',
      'ja-JP':
        'KanjiVGの日本字形パスを使用しています。筆画の形状は変更せず、元の順序で色を付けて再生します。',
      'ko-KR':
        'KanjiVG의 일본 자형 경로를 사용합니다. 획 모양은 바꾸지 않고 원래 순서대로 색을 입혀 재생합니다.',
    },
  },
  {
    id: 'hanzi-chars',
    use: {
      'zh-CN': '五地标准字表',
      'zh-TW': '五地標準字表',
      'zh-HK': '五地標準字表',
      'ja-JP': '5地域の標準字表',
      'ko-KR': '다섯 지역의 표준 한자표',
    },
    name: 'zispace/hanzi-chars',
    homepage: 'https://github.com/zispace/hanzi-chars',
    license: '仓库未声明',
    localizedLicense: {
      'ja-JP': 'リポジトリに記載なし',
      'ko-KR': '저장소에 명시되지 않음',
    },
    licenseUrl: 'https://github.com/zispace/hanzi-chars',
    note: {
      'zh-CN':
        '转录自各地官方规范：《通用规范汉字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）与《学年別漢字配当表》（2017）、韩国《漢文教育用基礎漢字》（2000）。',
      'zh-TW':
        '轉錄自各地官方規範：《通用規範漢字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）與《学年別漢字配当表》（2017）、韓國《漢文教育用基礎漢字》（2000）。',
      'zh-HK':
        '轉錄自各地官方規範：《通用規範漢字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）與《学年別漢字配当表》（2017）、韓國《漢文教育用基礎漢字》（2000）。',
      'ja-JP':
        '各地域の公式規範である中国大陸の『通用規範漢字表』（2013年）、台湾の『常用國字標準字體表』（1982年）、香港の『常用字字形表』、日本の『常用漢字表』（2010年）と『学年別漢字配当表』（2017年）、韓国の『漢文教育用基礎漢字』（2000年）から転記されています。',
      'ko-KR':
        '각 지역의 공식 규범인 중국 대륙의 《통용규범한자표》(通用規範漢字表, 2013), 대만의 《상용국자표준자체표》(常用國字標準字體表, 1982), 홍콩의 《상용자자형표》(常用字字形表), 일본의 《상용한자표》(常用漢字表, 2010)와 《학년별한자배당표》(学年別漢字配当表, 2017), 한국의 《한문교육용기초한자》(漢文教育用基礎漢字, 2000)에서 옮긴 자료입니다.',
    },
  },
  {
    id: 'unihan',
    use: {
      'zh-CN': '笔画数、读音',
      'zh-TW': '筆畫數、讀音',
      'zh-HK': '筆畫數、讀音',
      'ja-JP': '画数・読み',
      'ko-KR': '획수와 독음',
    },
    name: 'Unicode Han Database (Unihan)',
    homepage: 'https://www.unicode.org/reports/tr38/',
    license: 'Unicode License v3',
    licenseUrl: 'https://www.unicode.org/license.txt',
  },
  {
    id: 'korean-hanja-variants',
    use: {
      'zh-CN': '韩式异体对应',
      'zh-TW': '韓式異體對應',
      'zh-HK': '韓式異體對應',
      'ja-JP': '韓国の異体字対応',
      'ko-KR': '한국식 이체자 대응',
    },
    name: 'Unicode IRG N2200（韩国教育用汉字提案）',
    localizedName: {
      'zh-TW': 'Unicode IRG N2200（韓國教育用漢字提案）',
      'zh-HK': 'Unicode IRG N2200（韓國教育用漢字提案）',
      'ja-JP': 'Unicode IRG N2200（韓国の教育用漢字提案）',
      'ko-KR': 'Unicode IRG N2200(한국 교육용 한자 제안)',
    },
    homepage: 'https://www.unicode.org/L2/L2017/17173-irgn2200-unihan-db.pdf',
    license: 'Unicode License v3',
    licenseUrl: 'https://www.unicode.org/license.txt',
    note: {
      'zh-CN':
        '用于把韩国字表中跨码点的旧字形归入同一字组，包括以U+2E569编码的「衰」旧形。',
      'zh-TW':
        '用於把韓國字表中跨碼位的舊字形歸入同一字組，包括以U+2E569編碼的「衰」舊形。',
      'zh-HK':
        '用於把韓國字表中跨碼點的舊字形歸入同一字組，包括以U+2E569編碼的「衰」舊形。',
      'ja-JP':
        '韓国の字表にあるコードポイントの異なる旧字形を同じ文字グループへ統合するために使用します。「衰」の旧字形はU+2E569で符号化されています。',
      'ko-KR':
        '한국 한자표에서 코드 포인트가 다른 구자형을 같은 글자 그룹으로 통합하는 데 사용합니다. ‘衰’의 구자형은 U+2E569로 인코딩되어 있습니다.',
    },
  },
  {
    id: 'hanzidb',
    use: {
      'zh-CN': '大陆字频排名',
      'zh-TW': '大陸字頻排名',
      'zh-HK': '大陸字頻排名',
      'ja-JP': '中国大陸の文字頻度順位',
      'ko-KR': '중국 대륙 글자 빈도 순위',
    },
    name: 'hanziDB.csv（Jun Da《现代汉语单字频率列表》）',
    localizedName: {
      'ja-JP':
        'hanziDB.csv（Jun Da『Modern Chinese Character Frequency List』）',
      'ko-KR':
        'hanziDB.csv(Jun Da, 《Modern Chinese Character Frequency List》)',
    },
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
  kr: 'Korean',
}

const noto = (style: 'Sans' | 'Serif', region: string) =>
  gh(
    'notofonts/noto-cjk',
    'main',
    `${style}/OTF/${NOTO_DIR[region]}/Noto${style}CJK${region}-Regular.otf`,
  )

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

  // Latin, digits and punctuation for the interface, plus the tone marks the
  // readings carry. Cut from faces designed for Latin rather than from the
  // CJK families, whose Latin is a compromise.
  'font/NotoSans-VF.ttf': gh(
    'notofonts/notofonts.github.io',
    'main',
    'fonts/NotoSans/unhinted/variable-ttf/NotoSans%5Bwdth,wght%5D.ttf',
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

async function downloadLocked(
  name: string,
  path: string,
  asset: LockedAsset,
): Promise<Buffer> {
  const res = await fetch(asset.url)
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
