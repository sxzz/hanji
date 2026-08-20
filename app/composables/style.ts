import { STYLES, type Style } from '~~/shared/types.ts'
import { STYLE_KEY } from '~/utils/theme.ts'

/**
 * Typeface for the whole interface, remembered across visits.
 *
 * This is a reading preference rather than part of a result set, so it lives
 * in localStorage and stays out of the URL. The static head script applies it
 * to the root element before first paint, so no page flashes the wrong face.
 */
export function useStyle() {
  const stored = useLocalStorage<Style>(STYLE_KEY, 'sans')
  return computed<Style>({
    get: () => (STYLES.includes(stored.value) ? stored.value : 'sans'),
    set: (value) => (stored.value = value),
  })
}
