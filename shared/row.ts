import {
  REGIONS,
  type CharRow,
  type Column,
  type Region,
  type Style,
} from './types.ts'

/**
 * Which region's font should render this cell: the earliest region in its
 * group.
 *
 * Regions in one group are declared to write the character the same way, so
 * one of their fonts can draw for all of them -- which means the others need
 * not carry the character at all, dropping about a third of all glyphs from
 * the subsets. It also keeps the page honest: cells claimed to be the same are
 * then drawn from one glyph, so the claim and the picture cannot disagree.
 *
 * Sharing requires the codepoint to match too. Glyph alone is not enough:
 * distinct codepoints can map to the same CID (compatibility ideographs), and
 * borrowing a font that lacks the codepoint renders nothing.
 */
export function fontIndexOf(row: CharRow, region: number): number {
  for (let i = 0; i < region; i++)
    if (row.cp[i] === row.cp[region] && row.glyph[i] === row.glyph[region])
      return i
  return region
}

/** The region whose font actually renders this cell. */
export function fontRegionOf(row: CharRow, region: number): Region {
  // REGIONS and every regional tuple have the same length, so this is in range
  return REGIONS[fontIndexOf(row, region)]!
}

/** Whether this column uses the bundled supplemental face for this style. */
export function usesSupplementalFont(
  row: CharRow,
  column: Column,
  style: Style,
): boolean {
  return row.supplementalFont?.[style]?.includes(column) ?? false
}

/**
 * Split a signature into runs, used both for the underline beneath the
 * regional cells and for the filter chips.
 * "0112" -> [{ start: 0, span: 1 }, { start: 1, span: 2 }, { start: 3, span: 1 }]
 * The number of runs is the number of distinct ways of writing the character,
 * so the reader can simply count them.
 */
export interface Segment {
  start: number
  span: number
  group: number
}

export function segmentsOf(signature: string): Segment[] {
  const segments: Segment[] = []
  for (let i = 0; i < signature.length;) {
    let end = i
    while (end + 1 < signature.length && signature[end + 1] === signature[i])
      end++
    segments.push({ start: i, span: end - i + 1, group: Number(signature[i]) })
    i = end + 1
  }
  return segments
}

/** How many distinct ways of writing the character. */
export function varietyOf(signature: string): number {
  return new Set(signature).size
}

/**
 * The glyph partition over every column a row offers: the five regions, then
 * Japan's pre-reform form where the row has one. The kyujitai is numbered on
 * the same scale as the regions, so a sixth digit compares against the five.
 */
export function glyphSignature(row: CharRow): string {
  return row.old ? row.glyph + row.old.glyph : row.glyph
}

/** Position of a displayed column in glyphSignature's stored-region order. */
export function signatureIndexOf(column: Column): number {
  return column === 'old' ? REGIONS.length : REGIONS.indexOf(column)
}

/**
 * A signature restricted to the columns on show, renumbered so groups are
 * named by first appearance among them.
 *
 * Dropping a column is not enough on its own: "0122" with the first column
 * hidden reads "122", which no chip matches and which colors the survivors
 * from the second accent onward. Renumbering makes it "011" -- the same
 * partition every other three-column row of that shape carries.
 */
export function projectSignature(
  signature: string,
  columns: readonly number[],
): string {
  const groups = new Map<string, number>()
  let out = ''
  for (const index of columns) {
    const digit = signature[index]
    if (digit === undefined) continue
    if (!groups.has(digit)) groups.set(digit, groups.size)
    out += groups.get(digit)
  }
  return out
}
