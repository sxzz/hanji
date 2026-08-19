import { REGIONS, type CharRow, type Region } from './types.ts'

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
  // REGIONS and every Quad are both length 4, so this index is always in range
  return REGIONS[fontIndexOf(row, region)]!
}

/**
 * Split a signature into runs, used both for the underline beneath the four
 * cells and for the filter chips.
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
