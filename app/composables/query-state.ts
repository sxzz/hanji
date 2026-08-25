import { useRouteQuery } from '@vueuse/router'
import { toValue, type MaybeRefOrGetter, type Ref } from 'vue'

/**
 * Two-way bind a piece of state to a URL query parameter.
 *
 * The raw stored value is always the serialized string, so VueUse's identity
 * check against the default works for tuples and arrays too -- which is what
 * keeps `?st=1-36` out of the URL when the stroke range was never touched.
 * VueUse batches several writes in one tick into a single navigation, so
 * clearing four filters at once clears all four rather than only the last.
 */
export function useQueryState<T>(
  name: string,
  defaultValue: MaybeRefOrGetter<T>,
  parse: (raw: string) => T,
  serialize: (value: T) => string,
): Ref<T> {
  const fallback = () => serialize(toValue(defaultValue))

  return useRouteQuery<string, T>(name, fallback, {
    transform: {
      get: (raw) => {
        if (typeof raw !== 'string' || raw === '') return toValue(defaultValue)
        try {
          return parse(raw)
        } catch {
          return toValue(defaultValue)
        }
      },
      set: (value) => serialize(value),
    },
  })
}

export const asText = {
  parse: (raw: string) => raw,
  serialize: (value: string) => value,
}

export const asList = {
  parse: (raw: string) => raw.split(',').filter(Boolean),
  serialize: (value: string[]) => value.toSorted().join(','),
}

export function asOneOf<T extends string>(options: readonly T[]) {
  return {
    parse: (raw: string): T => {
      if (!(options as readonly string[]).includes(raw))
        throw new Error(`unknown ${raw}`)
      return raw as T
    },
    serialize: (value: T) => value,
  }
}

export const asRange = {
  parse: (raw: string): [number, number] => {
    const [loRaw, hiRaw, ...rest] = raw.split('-')
    if (
      loRaw === undefined ||
      hiRaw === undefined ||
      rest.length > 0 ||
      loRaw.trim() === '' ||
      hiRaw.trim() === ''
    )
      throw new Error('bad range')

    const lo = Number(loRaw)
    const hi = Number(hiRaw)
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi)
      throw new Error('bad range')

    return [lo, hi]
  },
  serialize: ([lo, hi]: [number, number]) => `${lo}-${hi}`,
}
