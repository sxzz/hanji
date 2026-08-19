import charsRaw from '~~/public/data/chars.json?raw'
import { plainReading } from '~~/shared/readings.ts'
import { varietyOf } from '~~/shared/row.ts'
import {
  REGIONS,
  type CharRow,
  type CharsData,
  type Region,
} from '~~/shared/types.ts'
import {
  asList,
  asOneOf,
  asRange,
  asText,
  useQueryState,
} from './query-state.ts'
import { useStyle } from './style.ts'

const data: CharsData = JSON.parse(charsRaw)

export const DIMENSIONS = ['glyph', 'cp'] as const
export type Dimension = (typeof DIMENSIONS)[number]

export const SORT_KEYS = ['common', 'strokes', 'cp', 'freq'] as const
export type SortKey = (typeof SORT_KEYS)[number]

export const ORDERS = ['asc', 'desc'] as const
export type Order = (typeof ORDERS)[number]

/** Rows per page. The list is rendered in full, so this bounds the DOM. */
export const PAGE_SIZE = 100

/** Below this many results the whole list can be rendered in one go. */
export const SHOW_ALL_LIMIT = 2000

const STROKE_BOUNDS: [number, number] = [
  Math.min(...data.rows.map((r) => Math.min(...r.strokes.filter(Boolean)))),
  Math.max(...data.rows.map((r) => Math.max(...r.strokes))),
]

/** Every character that names a row: its columns, key, kyujitai and aliases. */
const namesOf = (row: CharRow): string[] => [
  ...row.chars,
  row.key,
  row.old?.char ?? '',
  ...(row.aka ?? []),
]

/**
 * Character -> row indices. All four columns, the row key and the kyujitai go
 * into the index, so searching 国 and searching 國 land on the same row. That
 * is the "normalize, then match" behavior, without rerunning any conversion
 * at runtime.
 */
const charIndex = ((): Map<string, number[]> => {
  const index = new Map<string, number[]>()
  for (const [row, position] of data.rows.map((r, i) => [r, i] as const)) {
    for (const char of namesOf(row)) {
      if (!char) continue
      const list = index.get(char)
      if (list) {
        if (list.at(-1) !== position) list.push(position)
      } else index.set(char, [position])
    }
  }
  return index
})()

/** A row's partition signature under the chosen comparison dimension. */
export const signatureOf = (row: CharRow, dimension: Dimension): string =>
  dimension === 'glyph' ? row.glyph : row.cp

/** Group the 14 patterns by how many distinct ways of writing they describe.
 * Run count is variety count, which is the real structure of the content. */
export const PATTERNS_BY_VARIETY: { variety: number; patterns: string[] }[] =
  (() => {
    const all = new Set<string>()
    for (const row of data.rows) {
      all.add(row.glyph)
      all.add(row.cp)
    }
    const groups = new Map<number, string[]>()
    for (const pattern of [...all].toSorted()) {
      const variety = varietyOf(pattern)
      groups.set(variety, [...(groups.get(variety) ?? []), pattern])
    }
    return [...groups]
      .toSorted((a, b) => a[0] - b[0])
      .map(([variety, patterns]) => ({ variety, patterns }))
  })()

/**
 * The listing levels each region publishes. Selecting several within one
 * region widens the match; selecting across regions narrows it, so `cn1,jp2`
 * means a first-level mainland character that is also a Japanese kyoiku one.
 */
export const TIERS: { region: Region; tier: number; id: string }[] = [
  { region: 'cn', tier: 1, id: 'cn1' },
  { region: 'cn', tier: 2, id: 'cn2' },
  { region: 'cn', tier: 3, id: 'cn3' },
  { region: 'hk', tier: 1, id: 'hk1' },
  { region: 'tw', tier: 1, id: 'tw1' },
  { region: 'tw', tier: 2, id: 'tw2' },
  { region: 'jp', tier: 1, id: 'jp1' },
  { region: 'jp', tier: 2, id: 'jp2' },
]

const CODEPOINT = /^u\+?([\da-f]{4,6})$/i

export const rowsByKey = new Map(data.rows.map((row) => [row.key, row]))

/** The /char path for a row key, encoded once so callers cannot forget to. */
export const charPath = (key: string) => `/char/${encodeURIComponent(key)}`

/**
 * Characters that appear in a row without being its key: the mainland 国 under
 * the row keyed 國, or 著 under 着. Each is a URL of its own that redirects to
 * the row it belongs to, rather than a 404.
 *
 * A handful stand for more than one row -- 发 is both 發 and 髮, 个 is both 個
 * and 箇 -- and take the row that comes first in the default order, which is
 * the one nearly every reader means. Characters that key a row of their own
 * (台, 里, 后) are left alone: they are not aliases of anything.
 */
export const aliasTarget = ((): Map<string, string> => {
  const out = new Map<string, string>()
  for (const row of data.rows)
    for (const char of namesOf(row))
      if (char && !rowsByKey.has(char) && !out.has(char)) out.set(char, row.key)
  return out
})()

/** Every row that names the character, in default order. */
export const rowsNaming = (char: string): CharRow[] =>
  (charIndex.get(char) ?? []).map((index) => data.rows[index]!)

/**
 * The row a reader is opening, so its character can carry a
 * view-transition-name and morph into the one on the detail page.
 *
 * Exactly one element may hold a given name at a time, which is why this is a
 * single key rather than a name on every row.
 */
export function useMorphingKey() {
  return useState<string | null>('morphing', () => null)
}

/** A view-transition-name has to be a valid CSS identifier. */
export const morphName = (key: string) =>
  `char-${key.codePointAt(0)!.toString(16)}`

/**
 * Where the reader left the list: the full path carries the filters, sort and
 * page, and the offset carries how far down they had scrolled. Returning to a
 * different row of a different page would lose their place entirely.
 */

/**
 * The character the hero opens with. 返 is one of the 642 rows where all four
 * regions differ, and the differences sit in the radical, so they read even at
 * a glance.
 */
export const HERO_ROW = rowsByKey.get('返')!

export function useChars() {
  const asDimension = asOneOf(DIMENSIONS)
  const dimension = useQueryState(
    'd',
    'glyph' as Dimension,
    asDimension.parse,
    asDimension.serialize,
  )
  const patterns = useQueryState(
    'p',
    [] as string[],
    asList.parse,
    asList.serialize,
  )
  const sortKey = useQueryState(
    's',
    'common' as SortKey,
    asOneOf(SORT_KEYS).parse,
    asOneOf(SORT_KEYS).serialize,
  )
  const order = useQueryState(
    'o',
    'asc' as Order,
    asOneOf(ORDERS).parse,
    asOneOf(ORDERS).serialize,
  )
  const query = useQueryState('q', '', asText.parse, asText.serialize)
  const strokes = useQueryState(
    'st',
    STROKE_BOUNDS,
    asRange.parse,
    asRange.serialize,
  )
  const common = useQueryState(
    'c',
    [] as string[],
    asList.parse,
    asList.serialize,
  )
  const style = useStyle()
  const tiers = useQueryState(
    't',
    [] as string[],
    asList.parse,
    asList.serialize,
  )
  const page = useQueryState(
    'page',
    1,
    (raw) => Math.max(1, Math.trunc(Number(raw)) || 1),
    String,
  )

  /** Row indices matching the search, or null when there is no query. */
  const searchHits = computed<Set<number> | null>(() => {
    const text = query.value.trim()
    if (!text) return null

    const codepoint = CODEPOINT.exec(text)?.[1]
    if (codepoint) {
      const char = String.fromCodePoint(Number.parseInt(codepoint, 16))
      return new Set(charIndex.get(char))
    }

    const hits = new Set<number>()
    for (const char of text)
      for (const index of charIndex.get(char) ?? []) hits.add(index)
    if (hits.size) return hits

    // Fall back to a reading prefix: pinyin, jyutping or kana all work, and
    // tone marks are optional so `nian` finds nián
    const lower = plainReading(text)
    for (const [index, row] of data.rows.entries()) {
      const readings = row.readings
      if (!readings) continue
      const match = [
        ...(readings.mandarin ?? []),
        ...(readings.cantonese ?? []),
        ...(readings.on ?? []),
        ...(readings.kun ?? []),
      ].some((reading) => plainReading(reading).startsWith(lower))
      if (match) hits.add(index)
    }
    return hits
  })

  /** Everything except the pattern filter, so chip counts react to the rest. */
  const base = computed(() => {
    const hits = searchHits.value
    const [lo, hi] = strokes.value
    const wide = lo <= STROKE_BOUNDS[0] && hi >= STROKE_BOUNDS[1]
    const required = common.value
      .map((r) => REGIONS.indexOf(r as Region))
      .filter((i) => i >= 0)

    // Chosen tiers, grouped by region: any within a region, all across them
    const wanted = new Map<number, Set<number>>()
    for (const id of tiers.value) {
      const entry = TIERS.find((t) => t.id === id)
      if (!entry) continue
      const index = REGIONS.indexOf(entry.region)
      const set = wanted.get(index) ?? new Set<number>()
      set.add(entry.tier)
      wanted.set(index, set)
    }

    return data.rows.filter((row, index) => {
      if (hits && !hits.has(index)) return false
      if (!wide && row.strokes.every((n) => !(n >= lo) || !(n <= hi)))
        return false
      for (const i of required) if (!row.tier[i]) return false
      for (const [index, levels] of wanted)
        if (!levels.has(row.tier[index]!)) return false
      return true
    })
  })

  const counts = computed(() => {
    const tally: Record<string, number> = {}
    for (const row of base.value) {
      const signature = signatureOf(row, dimension.value)
      tally[signature] = (tally[signature] ?? 0) + 1
    }
    return tally
  })

  const FREQ_LAST = Number.MAX_SAFE_INTEGER
  const comparators: Record<SortKey, (a: CharRow, b: CharRow) => number> = {
    common: (a, b) =>
      b.common - a.common || (a.freq ?? FREQ_LAST) - (b.freq ?? FREQ_LAST),
    strokes: (a, b) => (a.strokes[0] || 99) - (b.strokes[0] || 99),
    cp: (a, b) => a.key.codePointAt(0)! - b.key.codePointAt(0)!,
    freq: (a, b) => (a.freq ?? FREQ_LAST) - (b.freq ?? FREQ_LAST),
  }

  const rows = computed(() => {
    const chosen = new Set(patterns.value)
    const filtered = chosen.size
      ? base.value.filter((row) =>
          chosen.has(signatureOf(row, dimension.value)),
        )
      : base.value

    const compare = comparators[sortKey.value]
    const sign = order.value === 'desc' ? -1 : 1
    return filtered.toSorted(
      (a, b) =>
        sign * (compare(a, b) || a.key.codePointAt(0)! - b.key.codePointAt(0)!),
    )
  })

  /** Paging can be switched off once the list is small enough to render whole. */
  const paged = useQueryState(
    'all',
    true,
    (raw) => raw !== '1',
    (value) => (value ? '' : '1'),
  )
  const canShowAll = computed(() => rows.value.length <= SHOW_ALL_LIMIT)
  const pageCount = computed(() =>
    paged.value ? Math.max(1, Math.ceil(rows.value.length / PAGE_SIZE)) : 1,
  )
  /** Rows on the current page, clamped in case a filter shortened the list. */
  const pageRows = computed(() => {
    if (!paged.value) return rows.value
    const current = Math.min(page.value, pageCount.value)
    const start = (current - 1) * PAGE_SIZE
    return rows.value.slice(start, start + PAGE_SIZE)
  })

  /**
   * Watching `rows` would reset the page on every navigation: vue-router
   * swaps the whole query object, so every filter computed re-evaluates and
   * `toSorted` hands back a fresh array even when nothing relevant changed.
   * Watch what the reader actually set instead.
   */
  const filterKey = computed(() =>
    JSON.stringify([
      dimension.value,
      patterns.value,
      sortKey.value,
      order.value,
      query.value,
      strokes.value,
      common.value,
      tiers.value,
    ]),
  )
  /**
   * Armed only once the first URL has settled. On a prerendered page the
   * router starts out on the route as generated -- with no query -- and fills
   * the real parameters in a moment later, which looks exactly like a filter
   * change and would throw away a shared link's page number.
   */
  const settled = ref(false)
  onMounted(() => nextTick(() => (settled.value = true)))
  watch(filterKey, () => {
    if (settled.value && page.value !== 1) page.value = 1
  })

  const dirty = computed(
    () =>
      patterns.value.length > 0 ||
      query.value !== '' ||
      common.value.length > 0 ||
      tiers.value.length > 0 ||
      strokes.value[0] !== STROKE_BOUNDS[0] ||
      strokes.value[1] !== STROKE_BOUNDS[1],
  )

  function reset() {
    patterns.value = []
    query.value = ''
    common.value = []
    tiers.value = []
    strokes.value = STROKE_BOUNDS
  }

  function togglePattern(pattern: string) {
    const chosen = new Set(patterns.value)
    if (chosen.has(pattern)) chosen.delete(pattern)
    else chosen.add(pattern)
    patterns.value = [...chosen]
  }

  return {
    stats: data.stats,
    rows,
    pageRows,
    pageCount,
    page,
    paged,
    canShowAll,
    style,
    counts,
    dimension,
    patterns,
    sortKey,
    order,
    query,
    strokes,
    common,
    tiers,
    dirty,
    reset,
    togglePattern,
    strokeBounds: STROKE_BOUNDS,
  }
}

export type CharsState = ReturnType<typeof useChars>

const CHARS_KEY: InjectionKey<CharsState> = Symbol('chars')

/**
 * One instance per page. Filtering 7,000 rows is not free, and every component
 * that reads the state must see the same result set.
 */
export function provideChars(): CharsState {
  const state = useChars()
  provide(CHARS_KEY, state)
  return state
}

export function injectChars(): CharsState {
  const state = inject(CHARS_KEY)
  if (!state) throw new Error('provideChars() must run in a parent component')
  return state
}
