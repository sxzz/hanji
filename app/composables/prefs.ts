import {
  COLUMNS,
  DEFAULT_HIDDEN_COLUMNS,
  REGIONS,
  type Column,
  type Region,
} from '~~/shared/types.ts'

const FLAGS: Record<Region, string> = {
  cn: '🇨🇳',
  hk: '🇭🇰',
  tw: '🇹🇼',
  jp: '🇯🇵',
  kr: '🇰🇷',
}

export const HIDDEN_KEY = 'hanji:hidden'
const VISIBILITY_VERSION_KEY = 'hanji:columns-v2'
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
 * Stored as what is hidden rather than what is shown. Korea is the one
 * opt-in comparison: the original four regions and Japan's old form remain
 * visible by default.
 */
export function useColumnVisibility() {
  const hidden = useLocalStorage<string[]>(HIDDEN_KEY, [
    ...DEFAULT_HIDDEN_COLUMNS,
  ])
  const visibilityInitialized = useLocalStorage(VISIBILITY_VERSION_KEY, false)

  // Read on the client only: the prerendered HTML has to match what hydration
  // produces, and localStorage is not available while prerendering.
  const mounted = ref(false)
  onMounted(() => {
    // Existing installations already have an empty `hanji:hidden` value from
    // the four-region build. Mark Korea hidden once during the upgrade while
    // preserving every earlier column choice. Afterwards the reader's Korea
    // toggle is authoritative.
    if (!visibilityInitialized.value) {
      hidden.value = COLUMNS.filter(
        (column) => column === 'kr' || hidden.value.includes(column),
      )
      visibilityInitialized.value = true
    }
    mounted.value = true
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

  /** Columns on show, in CN-HK-TW-JP-KR-old order. */
  const columns = computed(() =>
    COLUMNS.filter((column) => !off.value.has(column)),
  )
  const regions = computed(() =>
    REGIONS.filter((region) => !off.value.has(region)),
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
  const { t } = useT()
  const emojiFlags = useLocalStorage('hanji:emoji-flags', false)
  /**
   * Draw the stacked forms as outlines instead of solid ink. Filled strokes
   * that agree pile into a single mass; hollow ones stay legible through each
   * other, so where the forms part company reads at a glance.
   */
  const outline = useLocalStorage('hanji:outline', false)

  // Read on the client only: the prerendered HTML has to match what hydration
  // produces, and localStorage is not available while prerendering.
  const mounted = ref(false)
  onMounted(() => (mounted.value = true))
  const flagsOn = computed(() => mounted.value && emojiFlags.value)

  /** Short label for a region, as a flag or as a single character. */
  const regionLabel = (region: Region) =>
    flagsOn.value ? FLAGS[region] : t(`region.${region}.short`)

  /**
   * Flag emoji sit smaller than Han characters at the same font size, so they
   * need scaling up to hold the same weight in a row of labels.
   */
  const labelClass = computed(() => (flagsOn.value ? 'flag-label' : ''))

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
    emojiFlags,
    flagsOn,
    outline,
    outlineOn,
    regionLabel,
    labelClass,
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
