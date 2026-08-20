import charsRaw from '~~/public/data/chars.json?raw'
import { createListingMatcher, listingOptionsFor } from '~~/shared/listings.ts'
import {
  applicablePatternChoices,
  DEFAULT_PATTERN_CHOICES,
  parsePatternChoices,
  patternChoicesMatch,
  serializePatternChoices,
  toggleExactPatternChoice,
  toggleVarietyChoice,
} from '~~/shared/patterns.ts'
import { plainReading } from '~~/shared/readings.ts'
import { projectSignature, varietyOf } from '~~/shared/row.ts'
import {
  REGIONS,
  type CharRow,
  type CharsData,
  type Region,
} from '~~/shared/types.ts'
import { isUnicodeScalarValue } from '~/utils/unicode.ts'
import { useColumnVisibility } from './prefs.ts'
import {
  asList,
  asOneOf,
  asRange,
  asText,
  useQueryState,
} from './query-state.ts'
import { useStyle } from './style.ts'

const data: CharsData = JSON.parse(charsRaw)

export const stats = data.stats

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
  ...REGIONS.flatMap((region) =>
    (row.alternatives?.[region] ?? []).map((entry) => entry.char),
  ),
]

/**
 * Character -> row indices. All five columns, the row key and the kyujitai go
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

/**
 * A row's partition signature under the chosen comparison dimension, read over
 * the columns on show. Hiding a column repartitions what is left, so a row
 * whose shown regions ran CN | JP | HK+TW becomes a two-form row once Japan is
 * out -- and lands under the chip that says so.
 */
export const signatureOf = (
  row: CharRow,
  dimension: Dimension,
  columns: readonly number[],
): string =>
  projectSignature(dimension === 'glyph' ? row.glyph : row.cp, columns)

/** Group patterns by how many distinct ways of writing they describe.
 * Run count is variety count, which is the real structure of the content. */
function byVariety(
  patterns: Iterable<string>,
): { variety: number; patterns: string[] }[] {
  const groups = new Map<number, string[]>()
  for (const pattern of [...patterns].toSorted()) {
    const variety = varietyOf(pattern)
    groups.set(variety, [...(groups.get(variety) ?? []), pattern])
  }
  return [...groups]
    .toSorted((a, b) => a[0] - b[0])
    .map(([variety, patterns]) => ({ variety, patterns }))
}

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
 * The character the hero opens with. All five regions give 返 a distinct
 * glyph, and the differences sit in the radical, so they read at a glance.
 */
export const HERO_ROW = rowsByKey.get('返')!

export function useChars() {
  const { columns: visibleColumns, regionIndices } = useColumnVisibility()

  const asDimension = asOneOf(DIMENSIONS)
  const dimension = useQueryState(
    'd',
    'glyph' as Dimension,
    asDimension.parse,
    asDimension.serialize,
  )
  const patterns = useQueryState(
    'p',
    [...DEFAULT_PATTERN_CHOICES] as string[],
    parsePatternChoices,
    serializePatternChoices,
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
      const value = Number.parseInt(codepoint, 16)
      if (!isUnicodeScalarValue(value)) return new Set()
      const char = String.fromCodePoint(value)
      return new Set(charIndex.get(char))
    }

    const hits = new Set<number>()
    for (const char of text)
      for (const index of charIndex.get(char) ?? []) hits.add(index)
    if (hits.size) return hits

    // Fall back to a reading prefix: pinyin, jyutping, kana or Hangul all work,
    // and tone marks are optional so `nian` finds nián
    const lower = plainReading(text)
    for (const [index, row] of data.rows.entries()) {
      const readings = row.readings
      if (!readings) continue
      const match = [
        ...(readings.mandarin ?? []),
        ...(readings.cantonese ?? []),
        ...(readings.on ?? []),
        ...(readings.kun ?? []),
        ...(readings.korean ?? []),
      ].some((reading) => plainReading(reading).startsWith(lower))
      if (match) hits.add(index)
    }
    return hits
  })

  /** Choices whose column is still on show; the rest have nothing to narrow. */
  const availableListings = computed(
    () => new Set(listingOptionsFor(visibleColumns.value).map((o) => o.id)),
  )

  /**
   * Everything except the pattern filter, so chip counts react to the rest.
   *
   * A hidden column takes its own controls off the page, so its share of the
   * selection is left out of the match too -- rather than narrowing the list
   * from behind a control the reader can no longer see. The selection itself
   * is kept, and comes back with the column.
   */
  const base = computed(() => {
    const hits = searchHits.value
    const [lo, hi] = strokes.value
    const wide = lo <= STROKE_BOUNDS[0] && hi >= STROKE_BOUNDS[1]
    const shown = regionIndices.value
    const required = common.value
      .map((r) => REGIONS.indexOf(r as Region))
      .filter((i) => shown.includes(i))
    const matchesListings = createListingMatcher(
      tiers.value.filter((id) => availableListings.value.has(id)),
    )

    return data.rows.filter((row, index) => {
      if (hits && !hits.has(index)) return false
      if (
        !wide &&
        shown.every((i) => !(row.strokes[i]! >= lo) || !(row.strokes[i]! <= hi))
      )
        return false
      for (const i of required) if (!row.tier[i]) return false
      return matchesListings(row)
    })
  })

  const counts = computed(() => {
    const tally: Record<string, number> = {}
    for (const row of base.value) {
      const signature = signatureOf(row, dimension.value, regionIndices.value)
      tally[signature] = (tally[signature] ?? 0) + 1
    }
    return tally
  })

  /**
   * The partition chips are rebuilt whenever a column goes, because each
   * number of visible regions has a different set of possible partitions.
   */
  const patternGroups = computed(() => {
    const all = new Set<string>()
    for (const row of data.rows)
      for (const dim of DIMENSIONS)
        all.add(signatureOf(row, dim, regionIndices.value))
    return byVariety(all)
  })

  const FREQ_LAST = Number.MAX_SAFE_INTEGER
  /** How many of the columns on show list the character among their common. */
  const listedIn = (row: CharRow) =>
    regionIndices.value.filter((i) => row.tier[i]).length
  /** The stroke count the row leads with, which is the first column on show. */
  const leadStrokes = (row: CharRow) => row.strokes[regionIndices.value[0] ?? 0]
  const comparators: Record<SortKey, (a: CharRow, b: CharRow) => number> = {
    common: (a, b) =>
      listedIn(b) - listedIn(a) ||
      (a.freq ?? FREQ_LAST) - (b.freq ?? FREQ_LAST),
    strokes: (a, b) => (leadStrokes(a) || 99) - (leadStrokes(b) || 99),
    cp: (a, b) => a.key.codePointAt(0)! - b.key.codePointAt(0)!,
    freq: (a, b) => (a.freq ?? FREQ_LAST) - (b.freq ?? FREQ_LAST),
  }

  const rows = computed(() => {
    // A selection made against a different set of columns describes partitions
    // that no longer exist; it waits, unapplied, until those columns return.
    const available = patternGroups.value.flatMap((group) => group.patterns)
    const chosen = applicablePatternChoices(patterns.value, available)
    const filtered = chosen.length
      ? base.value.filter((row) =>
          patternChoicesMatch(
            signatureOf(row, dimension.value, regionIndices.value),
            chosen,
          ),
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

  /** Keep the URL-backed page itself valid, not only the rendered slice. */
  watch(
    [page, pageCount, paged],
    ([current, total, isPaged]) => {
      if (!isPaged) return
      const clamped = Math.min(Math.max(1, current), total)
      if (current !== clamped) page.value = clamped
    },
    { immediate: true, flush: 'sync' },
  )

  /** Rows on the current page. */
  const pageRows = computed(() => {
    if (!paged.value) return rows.value
    const start = (page.value - 1) * PAGE_SIZE
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
      serializePatternChoices(patterns.value) !==
        serializePatternChoices(DEFAULT_PATTERN_CHOICES) ||
      query.value !== '' ||
      common.value.length > 0 ||
      tiers.value.length > 0 ||
      strokes.value[0] !== STROKE_BOUNDS[0] ||
      strokes.value[1] !== STROKE_BOUNDS[1],
  )

  function reset() {
    patterns.value = [...DEFAULT_PATTERN_CHOICES]
    query.value = ''
    common.value = []
    tiers.value = []
    strokes.value = STROKE_BOUNDS
  }

  function togglePattern(pattern: string) {
    patterns.value = toggleExactPatternChoice(patterns.value, pattern)
  }

  function toggleVariety(variety: number, groupPatterns: readonly string[]) {
    patterns.value = toggleVarietyChoice(patterns.value, variety, groupPatterns)
  }

  return {
    stats,
    rows,
    pageRows,
    pageCount,
    page,
    paged,
    canShowAll,
    style,
    counts,
    patternGroups,
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
    toggleVariety,
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
