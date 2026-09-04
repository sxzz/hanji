import { glyphSignature, projectSignature, signatureIndexOf } from './row.ts'
import { REGIONS, type CharRow, type Column } from './types.ts'

/** Visible glyph groups listed in the regions selected under “Used in”. */
export function overprintCommonGroups(
  row: CharRow,
  columns: readonly Column[],
  selected: readonly string[],
): Set<number> {
  const signature = projectSignature(
    glyphSignature(row),
    columns.map(signatureIndexOf),
  )
  return new Set(
    columns.flatMap((column, position) =>
      column !== 'old' &&
      selected.includes(column) &&
      row.tier[REGIONS.indexOf(column)]
        ? [Number(signature[position])]
        : [],
    ),
  )
}

/**
 * sRGB equivalents of the light-paper overprint inks in vars.css. Resvg does
 * not understand OKLCH, so non-CSS renderers use these measured fallbacks.
 */
export const OVERPRINT_PLATE_SRGB = [
  '#855451',
  '#446787',
  '#696538',
  '#71587d',
  '#366f61',
] as const

/** Keep every stack on the same fixed five-ink sequence. */
export function overprintPlateIndex(group: number): number {
  const count = OVERPRINT_PLATE_SRGB.length
  return ((group % count) + count) % count
}

/** CSS color for a plate; a rare sixth form deliberately reuses the first. */
export function overprintColor(group: number): string {
  return `var(--c-o${overprintPlateIndex(group) + 1})`
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
