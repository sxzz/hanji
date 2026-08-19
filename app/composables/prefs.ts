import { REGIONS, type Region } from '~~/shared/types.ts'

const FLAGS: Record<Region, string> = {
  cn: '🇨🇳',
  hk: '🇭🇰',
  tw: '🇹🇼',
  jp: '🇯🇵',
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

  return {
    emojiFlags,
    flagsOn,
    outline,
    outlineOn,
    regionLabel,
    labelClass,
    REGIONS,
  }
}
