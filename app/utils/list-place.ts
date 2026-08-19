import type { Ref } from 'vue'

export interface ListPlace {
  /** Full path of the list, carrying its filters, sort and page. */
  fullPath: string
  scrollY: number
}

/**
 * Where the reader left the character list.
 *
 * A module-level ref rather than Nuxt state, because router.options.ts has to
 * read it from outside any component. Only the client ever writes it, so there
 * is nothing to leak between server requests.
 */
export const listPlace: Ref<ListPlace | null> = ref(null)
