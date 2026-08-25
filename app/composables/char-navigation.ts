/** The /char path for a row key, encoded once so callers cannot forget to. */
export const charPath = (key: string) => `/char/${encodeURIComponent(key)}`

/** The two stacks on the home page a character can be opened from. */
export type MorphSource = 'row' | 'hero'

export interface Morphing {
  key: string
  /**
   * Which stack was clicked. The hero and a row can be showing the same
   * character at once, and a view-transition-name may only be held by one
   * element in the document -- naming both would leave the browser with an
   * ambiguous pair and no transition at all. So each stack asks whether the
   * click was its own, rather than only whether the key matches.
   */
  from: MorphSource
}

/**
 * The character a reader is opening, so the stack they clicked can carry a
 * view-transition-name and morph into the one on the detail page.
 *
 * Exactly one element may hold a given name at a time, which is why this is a
 * single record rather than a name on every row.
 */
export function useMorphingKey() {
  return useState<Morphing | null>('morphing', () => null)
}

/** A view-transition-name has to be a valid CSS identifier. */
export const morphName = (key: string) =>
  `char-${key.codePointAt(0)!.toString(16)}`

/**
 * A click the browser should be left to handle itself: a new tab or window, or
 * anything but the primary button. There is nothing on the other side to morph
 * into, and the reader keeps their place in whatever they were reading.
 */
export const opensElsewhere = (event: MouseEvent) =>
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey ||
  (event.button !== undefined && event.button !== 0)

/**
 * Open a character with the stack that was clicked morphing into the one on
 * its page.
 *
 * The name has to be on the element before the navigation starts, so the
 * browser has something to match against when it takes the outgoing snapshot;
 * hence the tick between naming it and leaving.
 */
export function useMorphTo() {
  const morphing = useMorphingKey()
  return async function morphTo(key: string, from: MorphSource) {
    morphing.value = { key, from }
    await nextTick()
    await navigateTo(charPath(key))
  }
}
