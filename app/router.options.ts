import { listPlace } from './utils/list-place.ts'
import type { RouterConfig } from '@nuxt/schema'

const config: RouterConfig = {
  /**
   * Returning to the list puts the reader back where they were.
   *
   * This belongs here rather than in an onMounted hook: the router scrolls to
   * the top as part of the navigation, which would undo anything a component
   * did afterwards.
   */
  scrollBehavior(to, from, savedPosition) {
    const place = listPlace.value

    /*
     * A place describes one trip: out of the list by opening a row, and back.
     * Landing anywhere that is not a character page ends that trip, used or
     * not, so only a fresh row click can record another one.
     *
     * Without this a place outlived the trip it belonged to. Opening a
     * character from the hero records nothing -- the reader was never in the
     * list -- so returning from it found whichever place an earlier trip had
     * left behind and scrolled to a row they had not been looking at.
     */
    if (!to.path.startsWith('/char/')) listPlace.value = null

    if (savedPosition) return savedPosition

    // Hash navigation is an explicit destination, including when only the
    // hash changes on the current page. Leave one text line below the sticky
    // header so the target heading is visible rather than pinned underneath
    // it. The header is measured because --nav-h changes at the md breakpoint.
    if (to.hash) {
      const headerHeight =
        document.querySelector<HTMLElement>('header')?.offsetHeight ?? 0
      return { el: to.hash, top: headerHeight + 16 }
    }

    // Only on the way back from a character page. Adjusting a filter can land
    // on that very URL again -- which is the reader arriving there anew, not
    // returning to it.
    if (
      place &&
      from.path.startsWith('/char/') &&
      to.fullPath === place.fullPath
    )
      return { top: place.scrollY }

    // Same page, different query: the reader is adjusting the view in front of
    // them -- filtering, sorting, switching to the whole list -- and being
    // thrown to the top would lose the row they were looking at. Turning a
    // page does scroll, but it asks for that itself.
    if (to.path === from.path) return false

    return { top: 0 }
  },
}

export default config
