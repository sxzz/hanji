import {
  applyKoreanColumnDefault,
  COLUMNS,
  DEFAULT_HIDDEN_COLUMNS,
  REGIONS,
  type Column,
  type Region,
} from '~~/shared/types.ts'
import {
  COLUMN_MODE_KEY,
  FLAGS_KEY,
  HIDDEN_KEY,
  OUTLINE_KEY,
} from '~/utils/preference-restore.ts'

type PreferenceMode = 'default' | 'custom'
const isColumn = (value: string): value is Column =>
  (COLUMNS as readonly string[]).includes(value)

/**
 * Which columns take part in the comparison at all.
 *
 * A reader who never writes Japanese is not filtering Japan out of a result
 * set -- they are saying the Japanese column is not one of the things being
 * compared. So a hidden column leaves no cell, no chip and no group: the
 * remaining forms are partitioned again among themselves, and two regions that
 * only ever parted company through the hidden one now read as one form.
 *
 * Stored as what is hidden rather than what is shown. Korea starts hidden in
 * every interface except Korean, where it starts visible. That locale-aware
 * default follows language changes only until the reader customizes any
 * column; from then on their stored selection is authoritative.
 */
export function useColumnVisibility() {
  const { locale } = useT()
  const hidden = useLocalStorage<string[]>(HIDDEN_KEY, [
    ...DEFAULT_HIDDEN_COLUMNS,
  ])
  const preferenceMode = useLocalStorage<PreferenceMode>(
    COLUMN_MODE_KEY,
    'default',
  )

  const applyLocaleDefault = () => {
    hidden.value = applyKoreanColumnDefault(
      hidden.value,
      locale.value === 'ko-KR',
    )
  }

  // Read on the client only: the prerendered HTML has to match what hydration
  // produces, and localStorage is not available while prerendering.
  const mounted = ref(false)
  onMounted(() => {
    if (preferenceMode.value === 'default') applyLocaleDefault()
    mounted.value = true
  })

  watch(locale, () => {
    if (mounted.value && preferenceMode.value === 'default')
      applyLocaleDefault()
  })

  const off = computed<Set<Column>>(() => {
    if (!mounted.value) return new Set(DEFAULT_HIDDEN_COLUMNS)
    const chosen = new Set(hidden.value.filter(isColumn))
    // A table with no columns compares nothing. A stored value that hides
    // every region is unusable, so none of it is applied -- which keeps the
    // toggles and what is drawn saying the same thing.
    return REGIONS.every((region) => chosen.has(region))
      ? new Set(DEFAULT_HIDDEN_COLUMNS)
      : chosen
  })

  /** Columns on show, in CN-JP-old-HK-TW-KR display order. */
  const columns = computed(() =>
    COLUMNS.filter((column) => !off.value.has(column)),
  )
  const regions = computed(() =>
    COLUMNS.filter(
      (column): column is Region => column !== 'old' && !off.value.has(column),
    ),
  )
  /** The same regions as indices into REGIONS, which is how tuples are read. */
  const regionIndices = computed(() =>
    regions.value.map((region) => REGIONS.indexOf(region)),
  )
  const showOld = computed(() => !off.value.has('old'))

  /** Grid template for a row of cells, one track per region on show. */
  const tracks = computed(
    () => `repeat(${regions.value.length}, minmax(0, 1fr))`,
  )

  const shown = (column: Column) => !off.value.has(column)

  /** The last region on show cannot go: something has to be compared. */
  const locked = (column: Column) =>
    column !== 'old' && shown(column) && regions.value.length === 1

  function toggle(column: Column): void {
    if (locked(column)) return
    preferenceMode.value = 'custom'
    const chosen = new Set(off.value)
    if (chosen.has(column)) chosen.delete(column)
    else chosen.add(column)
    hidden.value = COLUMNS.filter((entry) => chosen.has(entry))
  }

  return {
    columns,
    regions,
    regionIndices,
    tracks,
    showOld,
    shown,
    locked,
    toggle,
  }
}

/**
 * Display preferences. These belong to the reader rather than to the result
 * set, so they live in localStorage and stay out of the URL.
 */
export function usePrefs() {
  // Keep the original storage key so existing readers retain their choice
  // after the visual labels move from platform emoji to local SVG artwork.
  const flagLabels = useLocalStorage(FLAGS_KEY, false)
  /**
   * Draw the stacked forms as outlines instead of solid ink. Filled strokes
   * that agree pile into a single mass; hollow ones stay legible through each
   * other, so where the forms part company reads at a glance.
   */
  const outline = useLocalStorage(OUTLINE_KEY, false)

  // Read on the client only: the prerendered HTML has to match what hydration
  // produces, and localStorage is not available while prerendering.
  const mounted = ref(false)
  onMounted(() => (mounted.value = true))
  const flagsOn = computed(() => mounted.value && flagLabels.value)

  const outlineOn = computed(() => mounted.value && outline.value)

  const {
    columns: visibleColumns,
    regions: visibleRegions,
    regionIndices,
    tracks: columnTracks,
    showOld,
    shown: columnShown,
    locked: columnLocked,
    toggle: toggleColumn,
  } = useColumnVisibility()

  return {
    flagLabels,
    flagsOn,
    outline,
    outlineOn,
    visibleColumns,
    visibleRegions,
    regionIndices,
    columnTracks,
    showOld,
    columnShown,
    columnLocked,
    toggleColumn,
    COLUMNS,
  }
}
