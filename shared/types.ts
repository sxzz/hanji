/** The four regions, fixed in CN-HK-TW-JP order: column position carries
 * regional identity, color carries only grouping. */
export const REGIONS = ['cn', 'hk', 'tw', 'jp'] as const
export type Region = (typeof REGIONS)[number]

/**
 * Typeface. Serif only changes what is drawn -- every judgment on this site is
 * made from the sans faces.
 */
export const STYLES = ['sans', 'serif'] as const
export type Style = (typeof STYLES)[number]

/**
 * What the detail page compares: the four regions, plus Japan's pre-reform
 * form where a row has one. The list pages compare regions alone.
 */
export const COLUMNS = [...REGIONS, 'old'] as const
export type Column = (typeof COLUMNS)[number]

/** A tuple in REGIONS order. */
export type Quad<T> = [T, T, T, T]

export interface ListedAlternative {
  /** A listed form that belongs to this row but is not the displayed form. */
  char: string
  /** Its level in this region's source list. */
  tier: number
  /** Whether the list enters it directly or only glosses it in brackets. */
  kind: 'primary' | 'glossed'
}

export interface CharRow {
  /** Orthodox (traditional) form; row identity and the /char/[key] segment. */
  key: string
  /** The character each region actually uses. */
  chars: Quad<string>
  /**
   * Japan's pre-reform form, present only when Japan writes a shinjitai. It is
   * always the row key, and it joins the comparison as a fifth column: its
   * `glyph` is a group of the same partition, numbered beyond the four when it
   * is written like none of them.
   */
  old?: { char: string; glyph: number; strokes: number }
  /**
   * Other orthodox forms naming this same group -- 脣 for the row keyed 唇.
   * They stay searchable and keep working as an address; the key is the form
   * the four regions actually write.
   */
  aka?: string[]
  /**
   * Listed regional forms accounted for by this row but not selected for its
   * four display columns. For example, mainland `祕` remains searchable here
   * while the column displays the more common level-1 `秘`.
   */
  alternatives?: Partial<Record<Region, ListedAlternative[]>>
  /** Codepoint partition signature; "0000" when all four share a codepoint. */
  cp: string
  /**
   * Glyph partition signature: how many distinct ways of writing the character
   * the four regions use.
   *
   * Two regions count as writing it the same way if EITHER the sans or the
   * serif faces give them one glyph. Source Han Sans hands Japan its own glyph
   * for a fifth of common characters, and for a couple of hundred of them the
   * serif faces do not -- 了, 人, 子, 水, 金 among them. A difference only one
   * typeface makes is a design decision, not a regional one, so agreement in
   * either face is taken as agreement.
   */
  glyph: string
  /** Stroke count per region. */
  strokes: Quad<number>
  /** Mainland frequency rank, lower is more common; absent when unranked. */
  freq?: number
  /** Listing level per region: cn 0-3, hk 0/1, tw 0 none / 1 common /
   * 2 secondary, jp 0 none / 1 joyo / 2 kyoiku. */
  tier: Quad<number>
  /** How many regions list it among their common characters, 1-4. */
  common: number
  /** Readings per language; absent languages simply have no entry. */
  readings?: {
    mandarin?: string[]
    cantonese?: string[]
    on?: string[]
    kun?: string[]
  }
}

export interface Stats {
  /** Han codepoints covered by Noto in all four regions. */
  cmapTotal: number
  /** Of those, how many differ between the four regions. */
  cmapDiffer: number
  /** Rows actually listed. */
  rows: number
  /** Of those, how many are written identically in all four regions. */
  identical: number
  /** Of those, how many differ in all four regions. */
  allDiffer: number
  /** Row count per signature, glyph dimension. */
  byGlyph: Record<string, number>
  /** Row count per signature, codepoint dimension. */
  byCp: Record<string, number>
}

export interface CharsData {
  stats: Stats
  rows: CharRow[]
}
