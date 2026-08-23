export const LOCALE_KEY = 'hanji:locale'
export const FLAGS_KEY = 'hanji:emoji-flags'
export const OUTLINE_KEY = 'hanji:outline'
export const STROKE_SPEED_KEY = 'hanji:stroke-speed'
export const HIDDEN_KEY = 'hanji:hidden'
export const COLUMN_MODE_KEY = 'hanji:columns-mode'

export const RESTORING_ATTRIBUTE = 'data-restoring-preferences'

/** Reveal the page after Vue has applied all persisted presentation state. */
export function revealRestoredPreferences(htmlLang: string): void {
  const root = document.documentElement
  // Unhead updates asynchronously after Vue's DOM. Pin the final language now
  // so the revealed translation cannot spend a frame in the SSG's CJK font.
  root.lang = htmlLang
  root.removeAttribute(RESTORING_ATTRIBUTE)
}
