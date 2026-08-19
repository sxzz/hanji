import { shouldUseViewTransition } from '~/utils/view-transition.ts'

/**
 * Nuxt normally decides from the destination alone. Set the option for each
 * navigation instead, because both ends must be home and a character detail.
 */
export default defineNuxtRouteMiddleware((to, from) => {
  to.meta.viewTransition = shouldUseViewTransition(from.path, to.path)
})
