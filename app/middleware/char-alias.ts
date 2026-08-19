import { aliasTarget, charPath, rowsByKey } from '~/composables/chars.ts'

/**
 * A character that is not a row key of its own still has a URL: /char/著
 * redirects to /char/着, /char/国 to /char/國. Anything that names no row at
 * all falls through to the page, which raises the 404.
 */
export default defineNuxtRouteMiddleware((to) => {
  const key = decodeURIComponent(String(to.params.key))
  if (rowsByKey.has(key)) return
  const target = aliasTarget.get(key)
  if (target)
    return navigateTo(charPath(target), { redirectCode: 302, replace: true })
})
