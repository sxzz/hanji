import {
  COLUMNS,
  REGIONS,
  type CharRow,
  type Column,
  type Region,
} from './types.ts'

/** AnimCJK has no Hong Kong set; HK borrows an available matching glyph. */
export const ANIMCJK_REGIONS = [
  'cn',
  'tw',
  'jp',
  'kr',
] as const satisfies readonly Region[]
export type AnimCJKRegion = (typeof ANIMCJK_REGIONS)[number]

/**
 * A fixed, deliberately small number of hash shards keeps a character lookup
 * light without spending one Cloudflare Pages file per character.
 */
export const STROKE_SHARD_COUNT = 32
export const STROKE_DATA_VERSION = 6

/** All regional forms in a row use the row key, and therefore one shard. */
export function strokeShardId(groupKey: string): string {
  const codePoint = Array.from(groupKey)[0]?.codePointAt(0)
  if (codePoint === undefined) throw new Error('stroke group key is empty')
  return (codePoint % STROKE_SHARD_COUNT).toString(16).padStart(2, '0')
}

/** Hong Kong borrows the first available source with the same regional glyph. */
export const HK_STROKE_FALLBACK = [
  'tw',
  'cn',
  'jp',
  'kr',
] as const satisfies readonly AnimCJKRegion[]

const STROKE_VARIANT_BITS = 3
const STROKE_VARIANT_MASK = (1 << STROKE_VARIANT_BITS) - 1

/** Read a column's row-local geometry index from its compact bit field. */
export function strokeVariantIndex(
  strokeMap: number | undefined,
  column: Column,
): number | undefined {
  const shift = COLUMNS.indexOf(column) * STROKE_VARIANT_BITS
  const encoded = ((strokeMap ?? 0) >> shift) & STROKE_VARIANT_MASK
  return encoded === 0 ? undefined : encoded - 1
}

/** Assign a row-local geometry index without disturbing the other columns. */
export function setStrokeVariant(
  strokeMap: number,
  column: Column,
  variant: number,
): number {
  if (!Number.isInteger(variant) || variant < 0 || variant >= COLUMNS.length)
    throw new Error(`invalid stroke variant: ${variant}`)
  const shift = COLUMNS.indexOf(column) * STROKE_VARIANT_BITS
  return (
    (strokeMap & ~(STROKE_VARIANT_MASK << shift)) | ((variant + 1) << shift)
  )
}

export interface StrokeDataRef {
  char: string
  region: AnimCJKRegion
  /** Index into the row group's deduplicated variants array. */
  variant: number
}

/** Resolve the actual regional dataset behind a visible comparison column. */
export function strokeDataRef(
  row: CharRow,
  column: Column,
): StrokeDataRef | undefined {
  const variant = strokeVariantIndex(row.strokeMap, column)
  if (variant === undefined) return undefined

  if (column === 'old')
    return row.old ? { char: row.old.char, region: 'jp', variant } : undefined

  if (column !== 'hk') {
    const index = REGIONS.indexOf(column)
    return { char: row.chars[index]!, region: column, variant }
  }

  const hkIndex = REGIONS.indexOf('hk')
  const hkGlyph = row.glyph[hkIndex]
  for (const region of HK_STROKE_FALLBACK) {
    const index = REGIONS.indexOf(region)
    if (
      row.glyph[index] === hkGlyph &&
      strokeVariantIndex(row.strokeMap, region) === variant
    )
      return { char: row.chars[index]!, region, variant }
  }
  return undefined
}

/** One stroke is stored as x, y, x, y... to keep the public shards compact. */
export type PackedMedian = number[]
export type PackedMedians = PackedMedian[]

export interface StrokeAnimationPath {
  d: string
  /** AnimCJK reveals this filled brush outline with the median path above. */
  outline: string
  order: number
}

export interface StrokeAnimationData {
  /** Applied to both outlines and medians in the source coordinate system. */
  transform?: string
  /** Width used to reveal an outline; centerline-only sources omit it. */
  revealWidth?: number
  strokes: StrokeAnimationPath[]
  viewBox: string
}

/** AnimCJK keeps the source outline and median for faithful clipped drawing. */
export interface PackedAnimCJK {
  medians: PackedMedians
  outlines: string[]
}

export interface PackedStrokeSourceMeta {
  license: string
  licenseUrl: string
  modification: string
  source: string
}

export interface PackedStrokeShard {
  _meta: {
    modifiedAt: string
    version: typeof STROKE_DATA_VERSION
    sources: {
      animcjk: PackedStrokeSourceMeta
    }
  }
  /** Entries are grouped by Hanji row so every regional switch reuses a file. */
  groups: Record<string, PackedStrokeGroup>
}

export interface PackedStrokeGroup {
  /** Each distinct ordered outline sequence is stored once per Hanji row. */
  variants: PackedAnimCJK[]
}
