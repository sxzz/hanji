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
import { format, resolveConfig } from 'prettier'
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
import type {
  CharRow,
  ListedAlternative,
  Quad,
  Region,
  Stats,
  UncertainRelation,
} from '../shared/types.ts'

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
const REGION_IDS = ['cn', 'hk', 'tw', 'jp'] as const

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
const standardToCn = reverseDict(st)
/**
 * Orthodox form -> the shinjitai Japan writes.
 *
 * Several shinjitai can share one orthodox form, and taking whichever came
 * first hands Japan a character its tables never mention: 鹽 came back as 䀋
 * rather than 塩, 莊 as 庄 rather than 荘. Japan's own tables break the tie.
 */
const standardToJp = ((): Map<string, string[]> => {
  const japanese = new Set([...covers['jp-joyo'], ...covers['jp-grade']])
  const out = new Map<string, string[]>()
  for (const [shinjitai, orthodox] of jpShinjitai)
    for (const form of orthodox) {
      if (form === shinjitai) continue
      const candidates = out.get(form) ?? []
      if (!candidates.includes(shinjitai)) candidates.push(shinjitai)
      out.set(form, candidates)
    }
  for (const candidates of out.values())
    candidates.sort((a, b) => Number(japanese.has(b)) - Number(japanese.has(a)))
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

  for (const standard of twToStandard.get(char) ?? []) keys.add(standard)
  for (const standard of hkToStandard.get(char) ?? []) keys.add(standard)

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

/** Every form OpenCC says a region can write an orthodox form as. */
const choices = (
  fallback: string,
  ...groups: (string[] | undefined)[]
): string[] => {
  const forms = [...new Set(groups.flatMap((group) => group ?? []))]
  return forms.length > 0 ? forms : [fallback]
}

const mainlandListsChar = (char: string) =>
  REGION_LISTS[0]!.some((list) => list.has(char))

const mainlandCandidates = (key: string): string[] => {
  const direct = ts.get(key)
  const reversed = standardToCn.get(key)
  // ST contains lexical substitutions as well as missing reverse mappings.
  // When both sides are independent mainland entries, the reverse evidence
  // remains an alternative but cannot replace the row's own listed form.
  if (
    !direct?.length &&
    mainlandListsChar(key) &&
    reversed?.some(mainlandListsChar)
  )
    return choices(key, [key], reversed)
  return choices(key, direct, reversed)
}

const convertedCandidates = (key: string): Quad<string[]> => [
  mainlandCandidates(key),
  choices(key, hkVariants.get(key)),
  choices(key, twVariants.get(key)),
  choices(key, standardToJp.get(key)),
]

const candidatesByRow = new WeakMap<CharRow, Quad<string[]>>()

function buildRow(
  key: string,
  chars: Quad<string>,
  aka?: string[],
  candidates: Quad<string[]> = chars.map((char) => [char]) as Quad<string[]>,
  alternatives?: CharRow['alternatives'],
): CharRow | undefined {
  const codePoints = chars.map((c) => c.codePointAt(0)!) as Quad<number>
  const sansCids = codePoints.map((cp, i) => sansCMaps[i]!.get(cp))
  // A character Noto does not cover can be neither drawn nor judged
  if (sansCids.includes(undefined)) return undefined

  const serifCids = codePoints.map((cp, i) => serifCMaps[i]!.get(cp))

  /**
   * Japan's pre-reform form must be an explicit JPShinjitaiCharacters pair.
   * A different key and Japanese column alone proves nothing: it can also be
   * a regional substitution or a conservative unlisted fallback.
   */
  const oldChar = standardToJp.get(key)?.includes(chars[3]) ? key : undefined
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
  const listing = chars.map((char, region) => {
    const entry = listingOf(region, char)
    return entry ? (entry.primary ? 'primary' : 'glossed') : 'unlisted'
  }) as CharRow['listing']
  // Readings belong to the character, and each region's own codepoint carries
  // its own: 国 has the Mandarin reading, 国 the Japanese one.
  const readings = {
    ...unihan.get(codePoints[0])?.readings,
    ...pick(unihan.get(codePoints[1])?.readings, 'cantonese'),
    ...pick(unihan.get(codePoints[3])?.readings, 'on', 'kun'),
  }

  const row: CharRow = {
    key,
    chars,
    ...(aka?.length ? { aka } : {}),
    ...(alternatives && Object.keys(alternatives).length > 0
      ? { alternatives }
      : {}),
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
    listing,
    common: tier.filter(Boolean).length,
    ...(Object.keys(readings).length > 0 ? { readings } : {}),
  }
  candidatesByRow.set(row, candidates)
  return row
}

for (const key of keys) {
  const candidates = convertedCandidates(key)
  const chars = candidates.map((forms) => forms[0] ?? key) as Quad<string>
  const row = buildRow(key, chars, undefined, candidates)
  if (row) rows.push(row)
  if (++done % 1000 === 0) console.error(`  ${done}/${keys.size}`)
}

/** Does one of a region's own primary tables enter this character? */
const listsChar = (region: number, char: string) =>
  REGION_LISTS[region]!.some((list) => list.has(char))

interface Listing {
  char: string
  tier: number
  primary: boolean
}

/** Listing evidence for one form, without losing whether it was only glossed. */
function listingOf(region: number, char: string): Listing | undefined {
  if (region === 0) {
    const tier = cn1.has(char) ? 1 : cn2.has(char) ? 2 : cn3.has(char) ? 3 : 0
    if (!tier) return undefined
    return {
      char,
      tier,
      primary:
        entries['cn-1'].has(char) ||
        entries['cn-2'].has(char) ||
        entries['cn-3'].has(char),
    }
  }
  if (region === 1) {
    if (!hk.has(char)) return undefined
    return {
      char,
      tier: 1,
      primary: entries['hk-common'].has(char),
    }
  }
  if (region === 2) {
    const tier = twCommon.has(char) ? 1 : twSub.has(char) ? 2 : 0
    if (!tier) return undefined
    return {
      char,
      tier,
      primary: entries['tw-common'].has(char) || entries['tw-sub'].has(char),
    }
  }
  const tier = jpGrade.has(char) ? 2 : jpJoyo.has(char) ? 1 : 0
  if (!tier) return undefined
  return {
    char,
    tier,
    primary: entries['jp-joyo'].has(char) || entries['jp-grade'].has(char),
  }
}

interface PendingUncertain {
  from: string
  to: string
  char: string
  region: Region
}

const pendingUncertain: PendingUncertain[] = []
const rootsByRow = new WeakMap<CharRow, string[]>()

const listedRegions = (char: string) =>
  REGION_IDS.filter((_, region) => listingOf(region, char) !== undefined).length

/** Row-generating common lists, with bracketed forms included. */
const addressListedRegions = (char: string) =>
  [
    cn1.has(char) || cn2.has(char) || cn3.has(char),
    hk.has(char),
    twCommon.has(char),
    jpJoyo.has(char),
  ].filter(Boolean).length

/** Prefer a group name; use a proven-safe displayed form only as a fallback. */
function chooseKey(
  names: string[],
  chars: Quad<string>,
  fallback: string[] = [],
): string {
  const eligible = names.filter(
    (name) => chars.includes(name) || addressListedRegions(name) > 0,
  )
  const candidates =
    eligible.length > 0 ? eligible : fallback.length > 0 ? fallback : names
  return candidates.toSorted(
    (a, b) =>
      chars.filter((char) => char === b).length -
        chars.filter((char) => char === a).length ||
      addressListedRegions(b) - addressListedRegions(a) ||
      a.codePointAt(0)! - b.codePointAt(0)!,
  )[0]!
}

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

  const groupRoots = new Set(groups.keys())
  const namedRoots = new Map<string, Set<string>>()
  for (const [root, group] of groups)
    for (const name of group.flatMap((row) => [row.key, ...(row.aka ?? [])]))
      namedRoots.set(name, new Set([...(namedRoots.get(name) ?? []), root]))
  const normalizedRoots = new Map<string, Set<string>>()
  const rootsOf = (char: string): Set<string> => {
    const held = normalizedRoots.get(char)
    if (held) return held
    const roots = new Set([
      ...(namedRoots.get(char) ?? []),
      ...normalize(char)
        .map(rootName)
        .filter((root) => groupRoots.has(root)),
    ])
    normalizedRoots.set(char, roots)
    return roots
  }

  const out: CharRow[] = []
  for (const [groupRoot, group] of groups) {
    const names = [...new Set(group.flatMap((r) => [r.key, ...(r.aka ?? [])]))]
    /** All OpenCC candidates survive until the regional form is selected. */
    const regionalCandidates = CMAP_REGION.map((_, region) => [
      ...new Set(
        group.flatMap(
          (row) =>
            (candidatesByRow.get(row)?.[region] ?? [
              row.chars[region]!,
            ]) as string[],
        ),
      ),
    ]) as Quad<string[]>

    const ownersOf = (char: string): Set<string> => {
      // A name is authoritative for its own group even when that spelling is
      // also a simplification standing for other characters (台, 后, 里).
      if (names.includes(char)) return new Set([groupRoot])
      const owners = rootsOf(char)
      // A form known only through this group's explicit regional mapping has
      // no competing final group, so it belongs here unless evidence appears.
      return owners.size > 0 ? owners : new Set([groupRoot])
    }
    const belongsOnlyHere = (char: string) => {
      const owners = ownersOf(char)
      return owners.size === 1 && owners.has(groupRoot)
    }

    /** Forms safe to carry across regions because no other final group owns them. */
    const safeForms = [
      ...new Set([...names, ...regionalCandidates.flat()]),
    ].filter(belongsOnlyHere)
    const support = REGION_IDS.filter((_, region) =>
      safeForms.some((char) => listingOf(region, char) !== undefined),
    ).length

    const reference = names.toSorted(
      (a, b) =>
        listedRegions(b) - listedRegions(a) ||
        a.codePointAt(0)! - b.codePointAt(0)!,
    )[0]!

    const allowed = regionalCandidates.map((candidates, region) =>
      candidates.filter((char) => {
        // The conservative split applies to a group attested in exactly one
        // region. A zero-attestation normalization target still needs its
        // source region's explicit form in order to represent that source.
        if (belongsOnlyHere(char) || support !== 1) return true
        for (const other of ownersOf(char))
          if (other !== groupRoot)
            pendingUncertain.push({
              from: groupRoot,
              to: other,
              char,
              region: REGION_IDS[region]!,
            })
        return false
      }),
    ) as Quad<string[]>

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
      const produced = allowed[region]!
      return (
        // This region's explicit mapping, when its own table enters it
        produced.find((char) => listsChar(region, char)) ??
        // A group name or uniquely-owned form may safely cross regions
        names.find((name) => listsChar(region, name)) ??
        safeForms.find((char) => listsChar(region, char)) ??
        // Otherwise retain a drawable form from this region's own mapping
        produced.find((char) => sansCMaps[region]!.has(char.codePointAt(0)!)) ??
        // With no listing evidence, preserve the group's inherited name
        reference
      )
    }) as Quad<string>

    const alternatives: NonNullable<CharRow['alternatives']> = {}
    for (const [region, id] of REGION_IDS.entries()) {
      const selected = chars[region]!
      const candidates = [
        ...new Set([...regionalCandidates[region]!, ...safeForms]),
      ]
      const listed = candidates
        .filter(belongsOnlyHere)
        .filter((char) => char !== selected)
        .map((char) => listingOf(region, char))
        .filter((entry): entry is Listing => entry !== undefined)
        .map(({ char, tier, primary }) => ({
          char,
          tier,
          kind: primary ? ('primary' as const) : ('glossed' as const),
        }))
      if (listed.length > 0) alternatives[id] = listed
    }

    const key = chooseKey(
      names,
      chars,
      [...new Set(chars)].filter(belongsOnlyHere),
    )
    const aka = names.filter((name) => name !== key)

    const folded = buildRow(key!, chars, aka, regionalCandidates, alternatives)
    if (!folded)
      throw new Error(
        `cannot render folded row ${key}: ${REGION_IDS.map((id, region) => `${id}:${chars[region]}`).join(' ')}; names=${names.join(' ')} candidates=${JSON.stringify(regionalCandidates)}`,
      )
    rootsByRow.set(folded, [groupRoot])
    out.push(folded)
  }
  return out
}

// A normalization target that no region lists and that accounts for no source
// entry is not a row of its own (戱 is already represented by 戯 under 戲).
rows = fold(rows).filter((row) => row.common > 0)

/**
 * Every primary source entry must be represented as either the displayed form
 * or a listed alternative. A few mainland entries have an ST mapping whose
 * orthodox target is absent from the reverse TS table (昵 -> 暱, 稆 -> 穭), or
 * whose target cannot be drawn in every regional font. In that case the source
 * entry itself is still drawable and gets a conservative, unconverted row
 * rather than disappearing during normalization.
 */
const rowEntries: Set<string>[] = [
  new Set([...entries['cn-1'], ...entries['cn-2'], ...entries['cn-3']]),
  entries['hk-common'],
  entries['tw-common'],
  entries['jp-joyo'],
]
const accountsFor = (region: number, char: string) =>
  rows.some(
    (row) =>
      row.chars[region] === char ||
      row.alternatives?.[REGION_IDS[region]!]?.some(
        (entry) => entry.char === char,
      ),
  )
const unrenderable: string[] = []
for (const [region, source] of rowEntries.entries())
  for (const char of source) {
    if (accountsFor(region, char)) continue
    const chars = REGION_IDS.map(() => char) as Quad<string>
    const fallback = buildRow(char, chars)
    if (fallback) {
      rootsByRow.set(fallback, [rootName(char)])
      rows.push(fallback)
    } else unrenderable.push(`${REGION_IDS[region]}:${char}`)
  }
if (unrenderable.length > 0)
  throw new Error(`unrenderable source entries: ${unrenderable.join(' ')}`)

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
  rows = [...byQuad.values()].map(([first, ...rest]) => {
    if (rest.length === 0) return first!
    const group = [first!, ...rest]
    const alternatives: NonNullable<CharRow['alternatives']> = {}
    for (const [region, id] of REGION_IDS.entries()) {
      const selected = first!.chars[region]!
      const listed = new Map<string, ListedAlternative>()
      for (const row of group)
        for (const entry of row.alternatives?.[id] ?? [])
          if (entry.char !== selected) {
            const held = listed.get(entry.char)
            listed.set(entry.char, {
              char: entry.char,
              tier: Math.min(held?.tier ?? entry.tier, entry.tier),
              kind:
                held?.kind === 'primary' || entry.kind === 'primary'
                  ? 'primary'
                  : 'glossed',
            })
          }
      if (listed.size > 0) alternatives[id] = [...listed.values()]
    }
    const names = [
      ...new Set(group.flatMap((row) => [row.key, ...(row.aka ?? [])])),
    ]
    const key = chooseKey(names, first!.chars)
    const merged = buildRow(
      key,
      first!.chars,
      names.filter((name) => name !== key),
      undefined,
      alternatives,
    )
    if (!merged) throw new Error(`cannot render merged row ${key}`)
    rootsByRow.set(merged, [
      ...new Set(group.flatMap((row) => rootsByRow.get(row) ?? [])),
    ])
    return merged
  })
}

/** Resolve conservative relationships only after every root has its final key. */
{
  const rowByRoot = new Map<string, CharRow>()
  for (const row of rows)
    for (const root of rootsByRow.get(row) ?? []) rowByRoot.set(root, row)

  const held = new Map<CharRow, Map<string, UncertainRelation>>()
  const add = (row: CharRow, other: CharRow, char: string, region: Region) => {
    if (row === other) return
    const relations = held.get(row) ?? new Map<string, UncertainRelation>()
    const id = `${other.key}\0${char}`
    const relation = relations.get(id) ?? {
      key: other.key,
      char,
      regions: [],
    }
    if (!relation.regions.includes(region)) relation.regions.push(region)
    relations.set(id, relation)
    held.set(row, relations)
  }

  for (const relation of pendingUncertain) {
    const from = rowByRoot.get(relation.from)
    const to = rowByRoot.get(relation.to)
    if (!from || !to) continue
    add(from, to, relation.char, relation.region)
    add(to, from, relation.char, relation.region)
  }

  for (const [row, relations] of held) {
    row.uncertain = [...relations.values()]
      .map((relation) => ({
        ...relation,
        regions: REGION_IDS.filter((region) =>
          relation.regions.includes(region),
        ),
      }))
      .toSorted(
        (a, b) =>
          a.key.codePointAt(0)! - b.key.codePointAt(0)! ||
          a.char.codePointAt(0)! - b.char.codePointAt(0)!,
      )
  }
}

/** Duplicate identities make aliases and row lookup silently overwrite data. */
{
  const keysSeen = new Set<string>()
  const quadsSeen = new Set<string>()
  for (const row of rows) {
    if (keysSeen.has(row.key)) throw new Error(`duplicate row key: ${row.key}`)
    keysSeen.add(row.key)
    const quad = row.chars.join('\0')
    if (quadsSeen.has(quad))
      throw new Error(`duplicate regional columns: ${row.chars.join(' / ')}`)
    quadsSeen.add(quad)
  }
  const namedBy = new Map<string, string>()
  for (const row of rows)
    for (const name of [row.key, ...(row.aka ?? [])])
      if (!namedBy.has(name)) namedBy.set(name, row.key)
  for (const row of rows)
    for (const region of REGION_IDS)
      for (const alternative of row.alternatives?.[region] ?? [])
        if (
          namedBy.has(alternative.char) &&
          namedBy.get(alternative.char) !== row.key
        )
          throw new Error(
            `${row.key}.${region} alternative belongs to row ${namedBy.get(alternative.char)}`,
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
await writeFile(
  readmePath,
  await format(await readFile(readmePath, 'utf8'), {
    ...(await resolveConfig(readmePath)),
    filepath: readmePath,
  }),
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
