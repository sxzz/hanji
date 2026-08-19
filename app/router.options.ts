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
    if (savedPosition) return savedPosition

    // Only on the way back from a character page. The place stays recorded
    // afterwards, and adjusting a filter can land on that very URL again --
    // which is the reader arriving there anew, not returning to it.
    const place = listPlace.value
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
