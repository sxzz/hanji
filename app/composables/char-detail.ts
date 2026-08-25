import type { CharRow } from '~~/shared/types.ts'

export interface CharDetailPayload {
  row: CharRow
  canonicalKeys: string[]
  namingRows: CharRow[]
}

/**
 * Hydrate a character page from its small prerendered payload. The complete
 * character dataset is imported only on the server, or after a client-side
 * navigation that genuinely needs a new record.
 */
export async function useCharDetail(key: Ref<string>) {
  const details = useState<Record<string, CharDetailPayload | null>>(
    'char-details',
    () => ({}),
  )
  const detail = shallowRef<CharDetailPayload | null>(null)
  let request = 0

  async function load(value: string) {
    const current = ++request
    let payload = details.value[value]
    if (payload === undefined) {
      const { charDetailForKey } = await import('./chars.ts')
      payload = charDetailForKey(value)
      details.value = { ...details.value, [value]: payload }
    }
    if (current === request) detail.value = payload
  }

  await load(key.value)
  watch(key, load)
  return detail
}
