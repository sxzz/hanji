/**
 * Generates public/data/chars.json.
 *
 * A row is a character group: one abstract character, with each of the four
 * columns holding the codepoint that region actually uses. The row key is the
 * orthodox (traditional) form, derived by deterministic normalization rather
 * than union-find -- many-to-one relations like 台 -> 臺/檯/颱 and 发 -> 發/髮
 * make union-find merge chains blow up.
 *
 * Every common character is listed, including the ~40% written identically
 * everywhere. Difference is a facet to filter on, not the entry condition.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseCMap, partitionSignature } from './cmap.ts'
import {
  DATA_DIR,
  loadUnihan,
  parseCharList,
  parseDict,
  parseFrequency,
  parsePrimaryCharList,
  rawText,
  reverseDict,
  ROOT,
  SOURCES,
} from './sources.ts'
import type { CharRow, Quad, Stats } from '../shared/types.ts'

const dict = async (name: string) =>
  parseDict(await rawText(`opencc/${name}.txt`))

console.error('Loading sources...')

const LISTS = [
  'cn-1',
  'cn-2',
  'cn-3',
  'tw-common',
  'tw-sub',
  'hk-common',
  'jp-joyo',
  'jp-grade',
] as const
type ListName = (typeof LISTS)[number]

const listTexts = await Promise.all(
  LISTS.map((name) => rawText(`charlist/${name}.txt`)),
)
const sets = (parse: (text: string) => string[]) =>
  Object.fromEntries(
    LISTS.map((name, index) => [name, new Set(parse(listTexts[index]!))]),
  ) as Record<ListName, Set<string>>

/** Every character a list covers, glossed variants included: listing levels. */
const covers = sets(parseCharList)
/** Only what a list enters in its own right: whether two characters are two. */
const entries = sets(parsePrimaryCharList)

const {
  'cn-1': cn1,
  'cn-2': cn2,
  'cn-3': cn3,
  'tw-common': twCommon,
  'tw-sub': twSub,
  'hk-common': hk,
  'jp-joyo': jpJoyo,
  'jp-grade': jpGrade,
} = covers

const [st, ts, twVariants, hkVariants, jpShinjitai] = await Promise.all(
  [
    'STCharacters',
    'TSCharacters',
    'TWVariants',
    'HKVariants',
    'JPShinjitaiCharacters',
  ].map(dict),
)

const CMAP_REGION = ['CN', 'HK', 'TW', 'JP'] as const

const loadCMaps = (style: 'sans' | 'serif') =>
  Promise.all(
    CMAP_REGION.map(async (r) =>
      parseCMap(await rawText(`cmap/${style}-${r}.txt`)),
    ),
  )

const sansCMaps = await loadCMaps('sans')
const serifCMaps = await loadCMaps('serif')

const unihan = await loadUnihan()
const frequency = parseFrequency(await rawText('frequency/hanziDB.csv'))

// Regional form -> OpenCC standard form. JPShinjitaiCharacters already runs
// shinjitai -> orthodox, so it needs no reversing.
const twToStandard = reverseDict(twVariants)
const hkToStandard = reverseDict(hkVariants)
/**
 * Orthodox form -> the shinjitai Japan writes.
 *
 * Several shinjitai can share one orthodox form, and taking whichever came
 * first hands Japan a character its tables never mention: 鹽 came back as 䀋
 * rather than 塩, 莊 as 庄 rather than 荘. Japan's own tables break the tie.
 */
const standardToJp = ((): Map<string, string> => {
  const japanese = new Set([...covers['jp-joyo'], ...covers['jp-grade']])
  const out = new Map<string, string>()
  for (const [shinjitai, orthodox] of jpShinjitai)
    for (const form of orthodox) {
      if (form === shinjitai) continue
      const held = out.get(form)
      if (
        held === undefined ||
        (!japanese.has(held) && japanese.has(shinjitai))
      )
        out.set(form, shinjitai)
    }
  return out
})()

/**
 * The lists that generate rows, grouped by the region publishing them.
 * Taiwan's secondary list and Japan's grade list only set listing levels.
 */
const REGION_LISTS: Set<string>[][] = [
  [entries['cn-1'], entries['cn-2'], entries['cn-3']],
  [entries['hk-common']],
  [entries['tw-common']],
  [entries['jp-joyo']],
]

/**
 * True when one region's own lists carry both characters.
 *
 * OpenCC's variant tables mix two relations. One is a regional way of writing
 * a single character (裏 / 裡) -- an identity, and reversing it is right. The
 * other is one character standing in for another: Taiwan writes 着 as 著,
 * postwar Japan writes 缺 as 欠, 罐 as 缶, 辯 as 弁. Reversing those is wrong,
 * because the character on the arrow's tail is current in its own right.
 *
 * A region listing the two side by side is that region saying they are two
 * characters, which is the evidence this uses -- no hand-kept exception list.
 */
function listedTogether(a: string, b: string): boolean {
  return REGION_LISTS.some(
    (lists) => lists.some((l) => l.has(a)) && lists.some((l) => l.has(b)),
  )
}

/**
 * Map any regional form back to its orthodox form. This can yield several --
 * 发 normalizes to both 發 and 髮, which are genuinely different characters.
 *
 * A character listed among its own ST values is itself a traditional form
 * (台, 里, 后, 只, 面, 干). Those keep themselves as a key, and additionally
 * keep whatever orthodox form they stand in for as a simplified or shinjitai
 * character.
 */
function normalize(char: string): string[] {
  const keys = new Set<string>()

  for (const orthodox of jpShinjitai.get(char) ?? []) keys.add(orthodox)

  const twStandard = twToStandard.get(char)
  if (twStandard) keys.add(twStandard)
  const hkStandard = hkToStandard.get(char)
  if (hkStandard) keys.add(hkStandard)

  const traditional = st.get(char)
  if (traditional) {
    if (traditional.includes(char)) keys.add(char)
    else for (const value of traditional) keys.add(value)
  }

  if (keys.size === 0) keys.add(char)

  // Folded into another character that its own region lists separately: keep
  // a row of its own as well, so 著 is not only "how Taiwan writes 着".
  if ([...keys].some((key) => key !== char && listedTogether(char, key)))
    keys.add(char)

  return [...keys]
}

/**
 * Keys that name the same character.
 *
 * `JPShinjitaiCharacters` names the character itself alongside the orthodox
 * form when the two are one character written two ways: `群 -> 群 羣`,
 * `唇 -> 唇 脣`, `峰 -> 峰 峯`. Both then become keys -- the regional variant
 * tables point the other way -- and the character ends up with two rows, one
 * of them carrying Hong Kong's form and one everybody else's.
 *
 * The self-naming is what marks the relation. A substitution names only the
 * other character (`台 -> 臺`, `欠 -> 缺`), and a simplification that stands
 * for several characters comes from STCharacters instead (`复 -> 復 複 覆`),
 * so neither is caught here.
 */
const nameParent = new Map<string, string>()
const rootName = (name: string): string => {
  const parent = nameParent.get(name)
  if (!parent || parent === name) return name
  const root = rootName(parent)
  nameParent.set(name, root)
  return root
}
const sameName = (a: string, b: string) => {
  const [ra, rb] = [rootName(a), rootName(b)]
  if (ra !== rb) nameParent.set(rb, ra)
}

const regionSets = [cn1, cn2, cn3, twCommon, hk, jpJoyo]
const keys = new Set<string>()
for (const set of regionSets)
  for (const char of set) {
    for (const key of normalize(char)) keys.add(key)
    const forms = jpShinjitai.get(char) ?? []
    if (forms.includes(char))
      for (const form of forms)
        // Unless a region's own table enters them side by side, in which case
        // that region has already said they are two characters
        if (!listedTogether(char, form)) sameName(char, form)
  }

console.error(
  `union of the four common-character lists: ${new Set(regionSets.flatMap((s) => [...s])).size} chars -> ${keys.size} orthodox keys`,
)

const first = (values: string[] | undefined, fallback: string) =>
  values?.[0] ?? fallback

function tierOf(chars: Quad<string>): Quad<number> {
  const [cn, hkChar, tw, jp] = chars
  return [
    cn1.has(cn) ? 1 : cn2.has(cn) ? 2 : cn3.has(cn) ? 3 : 0,
    hk.has(hkChar) ? 1 : 0,
    twCommon.has(tw) ? 1 : twSub.has(tw) ? 2 : 0,
    jpGrade.has(jp) ? 2 : jpJoyo.has(jp) ? 1 : 0,
  ]
}

/** IRG source letter per region, per https://www.unicode.org/irg/prefixes.html */
const IRG_SOURCE: Quad<string> = ['G', 'H', 'T', 'J']

/**
 * Stroke counts, taken per region wherever Unihan supports it.
 *
 * 1. kAlternateTotalStrokes names the IRG sources whose count differs from
 *    kTotalStrokes, so a region listed there is answered outright. It is the
 *    purpose-built field and the most authoritative, but it reaches only
 *    about a hundred codepoints.
 * 2. kRSAdobe_Japan1_6 analyzes the glyph in Adobe-Japan1-6, a Japanese
 *    collection, so radical plus residue is the count for the Japanese form
 *    -- 突 8 rather than 9, 海 9 rather than 10. It covers about 90% of the
 *    Japanese column, and applies to that column alone.
 * 3. kTotalStrokes otherwise. It carries at most two values, the first
 *    preferred for zh-Hans and the second for zh-Hant, with no finer split,
 *    so HK/TW/JP fall back to the second.
 */
function strokesFor(char: string, region: number): number {
  const entry = unihan.get(char.codePointAt(0)!)
  const alternate = entry?.altStrokes?.[IRG_SOURCE[region]!]
  if (alternate) return alternate
  if (region === 3 && entry?.adobeStrokes) return entry.adobeStrokes
  const values = entry?.strokes
  if (!values?.length) return 0
  return region === 0 ? values[0]! : (values[1] ?? values[0])!
}

function strokesOf(chars: Quad<string>): Quad<number> {
  return chars.map(strokesFor) as Quad<number>
}

/** Keep only the named keys, dropping the ones that are absent. */
function pick<T extends object, K extends keyof T>(
  source: T | undefined,
  ...keys: K[]
): Partial<T> {
  const out: Partial<T> = {}
  for (const key of keys)
    if (source?.[key] !== undefined) out[key] = source[key]
  return out
}

/**
 * Two regions write a character the same way if EITHER typeface gives them one
 * glyph. Source Han Sans hands Japan its own glyph for a fifth of common
 * characters; for a couple of hundred of those the serif faces do not, which
 * marks the difference as that typeface's design decision rather than a
 * regional one. Agreement in either face is therefore taken as agreement.
 *
 * The union of two equivalence relations need not be transitive, so the groups
 * are the connected components rather than the pairs themselves.
 */
function unifiedSignature(
  sans: (number | undefined)[],
  serif: (number | undefined)[],
): string {
  const parent = sans.map((_, i) => i)
  const find = (x: number): number =>
    parent[x] === x ? x : (parent[x] = find(parent[x]!))

  const agree = (a: (number | undefined)[], i: number, j: number) =>
    a[i] !== undefined && a[i] === a[j]

  for (let i = 0; i < parent.length; i++)
    for (let j = i + 1; j < parent.length; j++) {
      if (!agree(sans, i, j) && !agree(serif, i, j)) continue
      const [ri, rj] = [find(i), find(j)]
      if (ri !== rj) parent[rj] = ri
    }
  // Groups are numbered by first appearance, so adding a participant at the
  // end never renumbers the ones before it.
  return partitionSignature(parent.map((_, i) => find(i)))
}

let rows: CharRow[] = []
const byGlyph: Record<string, number> = {}
const byCp: Record<string, number> = {}
let done = 0

/** What OpenCC says each region writes an orthodox form as. */
const converted = (key: string): Quad<string> => [
  first(ts.get(key), key),
  first(hkVariants.get(key), key),
  first(twVariants.get(key), key),
  standardToJp.get(key) ?? key,
]

function buildRow(
  key: string,
  chars: Quad<string>,
  aka?: string[],
): CharRow | undefined {
  const codePoints = chars.map((c) => c.codePointAt(0)!) as Quad<number>
  const sansCids = codePoints.map((cp, i) => sansCMaps[i]!.get(cp))
  // A character Noto does not cover can be neither drawn nor judged
  if (sansCids.includes(undefined)) return undefined

  const serifCids = codePoints.map((cp, i) => serifCMaps[i]!.get(cp))

  /**
   * Japan's pre-reform form, drawn and judged from Japan's own faces. It joins
   * the comparison as a fifth participant, so a reader can see at a glance
   * that the kyujitai is the character Hong Kong and Taiwan still write.
   *
   * It is the row key: the key is the orthodox form, and this branch is only
   * reached when Japan writes something else. Reading it off OpenCC's
   * shinjitai table instead would take in pairs that are nothing of the kind
   * -- 群/羣 is Hong Kong's standard form, 稜/棱 a simplification.
   */
  const oldChar = chars[3] === key ? undefined : key
  const oldPoint = oldChar?.codePointAt(0)
  const oldSans =
    oldPoint === undefined ? undefined : sansCMaps[3]!.get(oldPoint)
  const hasOld = oldChar !== undefined && oldSans !== undefined
  const oldSerif =
    oldPoint === undefined ? undefined : serifCMaps[3]!.get(oldPoint)

  const signature = unifiedSignature(
    hasOld ? [...sansCids, oldSans] : sansCids,
    hasOld ? [...serifCids, oldSerif] : serifCids,
  )
  const glyph = signature.slice(0, 4)
  const cp = partitionSignature(codePoints)

  const tier = tierOf(chars)
  // Readings belong to the character, and each region's own codepoint carries
  // its own: 国 has the Mandarin reading, 国 the Japanese one.
  const readings = {
    ...unihan.get(codePoints[0])?.readings,
    ...pick(unihan.get(codePoints[1])?.readings, 'cantonese'),
    ...pick(unihan.get(codePoints[3])?.readings, 'on', 'kun'),
  }

  return {
    key,
    chars,
    ...(aka?.length ? { aka } : {}),
    ...(hasOld
      ? {
          old: {
            char: oldChar,
            glyph: Number(signature[4]),
            strokes: strokesFor(oldChar, 3),
          },
        }
      : {}),
    cp,
    glyph,
    strokes: strokesOf(chars),
    ...(frequency.has(chars[0]) ? { freq: frequency.get(chars[0]) } : {}),
    tier,
    common: tier.filter(Boolean).length,
    ...(Object.keys(readings).length > 0 ? { readings } : {}),
  }
}

for (const key of keys) {
  const row = buildRow(key, converted(key))
  if (row) rows.push(row)
  if (++done % 1000 === 0) console.error(`  ${done}/${keys.size}`)
}

/** Does one of a region's own tables enter this character in its own right? */
const listsChar = (region: number, char: string) =>
  REGION_LISTS[region]!.some((list) => list.has(char))

/**
 * Every character some table enters in its own right, secondary lists
 * included.
 *
 * This separates a form that is written somewhere -- 檯 sits in 次常用國字表,
 * and Japan simply has no character for it -- from one nobody writes at all,
 * which is what the pre-reform shapes OpenCC records are: 郞, 硏, 晄, 襃. Only
 * the second kind is worth replacing with another form of the group.
 */
const WRITTEN_ANYWHERE = new Set(
  Object.values(entries).flatMap((list) => [...list]),
)

/**
 * Fold the rows that name one character into a single one.
 *
 * Two things can put a character in the table twice. The tables can disagree
 * about which form is orthodox, which `sameName` has already recorded -- 群
 * and 羣, 唇 and 脣, 戸 and 戶. Or two orthodox forms can simply come out with
 * the same four columns, as 才 and 纔 do.
 *
 * The columns are settled first and the key chosen from them afterwards. A
 * key that no table maps anywhere fills all four of its own columns, which
 * would otherwise make it look like the form everyone writes: 戸 fills 戸戸戸戸
 * only because OpenCC has nothing to say about it, while 戶 knows it is 户 on
 * the mainland.
 */
function fold(all: CharRow[]): CharRow[] {
  // Rows join a group either because the tables call their keys one character
  // or because they come out with the same four columns anyway
  const byQuad = new Map<string, string>()
  for (const row of all) {
    const quad = row.chars.join('')
    const first = byQuad.get(quad)
    if (first) sameName(first, row.key)
    else byQuad.set(quad, row.key)
  }

  const groups = new Map<string, CharRow[]>()
  for (const row of all) {
    const id = rootName(row.key)
    groups.set(id, [...(groups.get(id) ?? []), row])
  }

  const out: CharRow[] = []
  for (const group of groups.values()) {
    const names = [...new Set(group.flatMap((r) => [r.key, ...(r.aka ?? [])]))]

    /**
     * Every form the group knows about: what OpenCC produced for any column,
     * and the orthodox names themselves.
     */
    const pool = [...new Set([...group.flatMap((row) => row.chars), ...names])]

    /**
     * What each region writes. OpenCC's answer wins when that region's own
     * table lists it; otherwise whichever form of the group the table does
     * list, because the standard tables are what this site is built on.
     *
     * Looking across the whole group rather than at one column matters:
     * `JPShinjitaiCharacters` records Japanese pre-reform shapes -- 郎 -> 郞,
     * 研 -> 硏, 晃 -> 晄 -- as plain orthodox forms, and unlike 群 -> 群 羣 it
     * does not name the character itself, so the pre-reform shape became the
     * key and OpenCC had nothing to convert it back to for the other three
     * columns. They ended up showing a form no region writes, with a listing
     * level of zero to match.
     */
    const chars = CMAP_REGION.map((_, region) => {
      const produced = group.map((row) => row.chars[region]!)
      return (
        // OpenCC's answer, when this region's own table enters it
        produced.find((char) => listsChar(region, char)) ??
        // failing that, an orthodox name of the group that it enters
        names.find((name) => listsChar(region, name)) ??
        // otherwise keep OpenCC's answer, as long as it is a form somewhere
        // writes -- a region filing it under a secondary list is not a reason
        // to swap in a different character
        (WRITTEN_ANYWHERE.has(produced[0]!)
          ? produced[0]!
          : (pool.find((char) => listsChar(region, char)) ?? produced[0]!))
      )
    }) as Quad<string>

    // The key is the form most of the four columns actually use, then the one
    // the most tables list, then the lower codepoint so the choice is stable.
    const fills = (name: string) => chars.filter((c) => c === name).length
    const listed = (name: string) =>
      REGION_LISTS.filter((lists) => lists.some((l) => l.has(name))).length
    /**
     * The orthodox name keeps the address as long as some region writes it,
     * which is what makes 國 rather than 国 the name of that row. Only when
     * no name survives into a column -- the pre-reform shapes above, which no
     * region writes at all -- does the address fall to the written form.
     */
    const rank = (forms: string[]) =>
      forms.toSorted(
        (a, b) =>
          fills(b) - fills(a) ||
          listed(b) - listed(a) ||
          a.codePointAt(0)! - b.codePointAt(0)!,
      )
    const written = names.filter((name) => chars.includes(name))
    const key = rank(written.length > 0 ? written : pool)[0]!
    const aka = names.filter((name) => name !== key)

    const folded = buildRow(key!, chars, aka)
    if (folded) out.push(folded)
    else if (group.length === 1) out.push(group[0]!)
  }
  return out
}

rows = fold(rows)

/**
 * Substituting a form can leave two rows with the same four columns -- one of
 * them named by a pre-reform shape nobody writes. One group, one row.
 */
{
  const byQuad = new Map<string, CharRow[]>()
  for (const row of rows) {
    const id = row.chars.join('')
    byQuad.set(id, [...(byQuad.get(id) ?? []), row])
  }
  rows = [...byQuad.values()].map(([first, ...rest]) =>
    rest.length === 0
      ? first!
      : {
          ...first!,
          aka: [
            ...new Set([
              ...(first!.aka ?? []),
              ...rest.flatMap((r) => [r.key, ...(r.aka ?? [])]),
            ]),
          ],
        },
  )
}

for (const row of rows) {
  byGlyph[row.glyph] = (byGlyph[row.glyph] ?? 0) + 1
  byCp[row.cp] = (byCp[row.cp] ?? 0) + 1
}

// Default order: most regions first, then mainland frequency, unranked last
const FREQ_LAST = Number.MAX_SAFE_INTEGER
rows.sort(
  (a, b) =>
    b.common - a.common ||
    (a.freq ?? FREQ_LAST) - (b.freq ?? FREQ_LAST) ||
    a.key.codePointAt(0)! - b.key.codePointAt(0)!,
)

// Whole-CMap tally, so the page can say how much of it this table covers
const HAN_BLOCKS: [number, number][] = [
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xf900, 0xfaff],
  [0x2_0000, 0x2_fa1f],
]
let cmapTotal = 0
let cmapDiffer = 0
for (const [lo, hi] of HAN_BLOCKS) {
  for (let cp = lo; cp <= hi; cp++) {
    const cids = sansCMaps.map((m) => m.get(cp))
    if (cids.includes(undefined)) continue
    const serif = serifCMaps.map((m) => m.get(cp))
    cmapTotal++
    if (unifiedSignature(cids, serif) !== '0000') cmapDiffer++
  }
}

const stats: Stats = {
  cmapTotal,
  cmapDiffer,
  rows: rows.length,
  identical: byGlyph['0000'] ?? 0,
  allDiffer: byGlyph['0123'] ?? 0,
  byGlyph,
  byCp,
}

await mkdir(DATA_DIR, { recursive: true })
await writeFile(
  join(DATA_DIR, 'chars.json'),
  `${JSON.stringify({ stats, rows })}\n`,
)
await writeFile(
  join(DATA_DIR, 'sources.json'),
  `${JSON.stringify(SOURCES, null, 2)}\n`,
)

// Keep the README's table generated from the same list the site renders, so
// there is only ever one place to update attribution.
const readmePath = join(ROOT, 'README.md')
const readme = await readFile(readmePath, 'utf8')
const table = [
  '| 用途 | 来源 | 许可 |',
  '| --- | --- | --- |',
  ...SOURCES.map(
    (source) =>
      `| ${source.use['zh-CN']} | [${source.name}](${source.homepage}) | [${source.license}](${source.licenseUrl}) |`,
  ),
].join('\n')
await writeFile(
  readmePath,
  readme.replace(
    /<!-- sources:start -->[\s\S]*?<!-- sources:end -->/,
    `<!-- sources:start -->\n${table}\n<!-- sources:end -->`,
  ),
)

const tally = (counts: Record<string, number>) =>
  Object.entries(counts)
    .toSorted((a, b) => b[1] - a[1])
    .map(([signature, count]) => `${signature}=${count}`)
    .join(' ')

console.error(`
whole CMap: ${cmapTotal} Han codepoints, ${cmapDiffer} differ between the four regions
listed:     ${rows.length} rows, ${stats.identical} identical everywhere, ${stats.allDiffer} differ in all four
by glyph:   ${tally(byGlyph)}
by cp:      ${tally(byCp)}
`)
