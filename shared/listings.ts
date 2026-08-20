import { REGIONS, type CharRow, type Column, type Region } from './types.ts'

export type ListingOption =
  | { id: string; kind: 'tier'; region: Region; tier: number }
  | { id: 'old'; kind: 'old'; region: 'jp' }

/**
 * Every choice shown under “listed in”. Choices from one region widen the
 * match, while choices from different regions narrow it. Japan's old forms
 * belong to the Japanese group even when the modern character is not in a
 * current Japanese list.
 */
export const LISTING_OPTIONS: readonly ListingOption[] = [
  { id: 'cn1', kind: 'tier', region: 'cn', tier: 1 },
  { id: 'cn2', kind: 'tier', region: 'cn', tier: 2 },
  { id: 'cn3', kind: 'tier', region: 'cn', tier: 3 },
  { id: 'hk1', kind: 'tier', region: 'hk', tier: 1 },
  { id: 'tw1', kind: 'tier', region: 'tw', tier: 1 },
  { id: 'tw2', kind: 'tier', region: 'tw', tier: 2 },
  { id: 'jp1', kind: 'tier', region: 'jp', tier: 1 },
  { id: 'jp2', kind: 'tier', region: 'jp', tier: 2 },
  { id: 'kr1', kind: 'tier', region: 'kr', tier: 1 },
  { id: 'old', kind: 'old', region: 'jp' },
]

/**
 * The choices worth offering for a given set of columns. A region the reader
 * has hidden has no forms on the page, so its listing levels have nothing left
 * to narrow.
 */
export function listingOptionsFor(
  columns: readonly Column[],
): readonly ListingOption[] {
  return LISTING_OPTIONS.filter((option) =>
    columns.includes(option.kind === 'old' ? 'old' : option.region),
  )
}

const OPTIONS_BY_ID = new Map(
  LISTING_OPTIONS.map((option) => [option.id, option]),
)

/** Compile the selected choices into a row predicate. */
export function createListingMatcher(
  selected: readonly string[],
): (row: CharRow) => boolean {
  const wanted = new Map<Region, ListingOption[]>()
  for (const id of selected) {
    const option = OPTIONS_BY_ID.get(id)
    if (!option) continue
    const group = wanted.get(option.region) ?? []
    group.push(option)
    wanted.set(option.region, group)
  }

  return (row) => {
    for (const [region, options] of wanted) {
      const index = REGIONS.indexOf(region)
      const matches = options.some((option) =>
        option.kind === 'old'
          ? row.old !== undefined
          : row.tier[index] === option.tier,
      )
      if (!matches) return false
    }
    return true
  }
}
