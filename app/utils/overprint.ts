import { REGIONS, type CharRow, type Column } from '~~/shared/types.ts'

/** Five fixed, equal-strength inks shared by every stack in the product. */
const PLATE_COUNT = 5

/**
 * Keep the same group order for every character so changing the row never
 * reshuffles its colors. A rare sixth distinct form reuses the first ink
 * rather than expanding the deliberately limited palette.
 */
export function overprintColor(group: number): string {
  return `var(--c-o${(group % PLATE_COUNT) + 1})`
}

/**
 * Dense glyphs need more paper showing through than sparse ones. Their fill
 * recedes while the shared registration edge stays firm, so every plate keeps
 * the same visual weight without turning a complex stack into a dark block.
 */
export function overprintOpacity(
  row: CharRow,
  columns: readonly Column[],
): number {
  const strokes = columns.flatMap((column) => {
    if (column === 'old') return row.old ? [row.old.strokes] : []
    const index = REGIONS.indexOf(column)
    return index === -1 ? [] : [row.strokes[index]!]
  })
  const max = Math.max(0, ...strokes)
  if (max >= 20) return 0.24
  if (max >= 15) return 0.28
  if (max >= 10) return 0.32
  return 0.42
}
