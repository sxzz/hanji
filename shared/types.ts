/** The five regions in stored tuple order. Column position carries regional
 * identity in generated data; display order is defined separately below. */
export const REGIONS = ['cn', 'hk', 'tw', 'jp', 'kr'] as const
export type Region = (typeof REGIONS)[number]

/** Regions with a directly observed character-frequency corpus. */
export const FREQUENCY_REGIONS = ['cn', 'hk', 'tw', 'jp'] as const
export type FrequencyRegion = (typeof FREQUENCY_REGIONS)[number]

/**
 * Typeface. Serif only changes what is drawn -- every judgment on this site is
 * made from the sans faces.
 */
export const STYLES = ['sans', 'serif'] as const
export type Style = (typeof STYLES)[number]

/**
 * Display order for the five regions and Japan's pre-reform form. Keeping this
 * separate from REGIONS lets generated tuples retain their stable data shape.
 */
export const COLUMNS = ['cn', 'jp', 'old', 'hk', 'tw', 'kr'] as const
export type Column = (typeof COLUMNS)[number]

/** Korea starts hidden outside the Korean interface; all other columns start on. */
export const DEFAULT_HIDDEN_COLUMNS: readonly Column[] = ['kr']

/**
 * Apply the interface-language default for Korea without disturbing any other
 * hidden columns. Callers only use this until the reader customizes the set.
 */
export function applyKoreanColumnDefault(
  hidden: readonly string[],
  koreanLocale: boolean,
): Column[] {
  return COLUMNS.filter((column) =>
    column === 'kr' ? !koreanLocale : hidden.includes(column),
  )
}

/** A tuple in REGIONS order. */
export type RegionalTuple<T> = [T, T, T, T, T]

export interface ListedAlternative {
  /** A listed form that belongs to this row but is not the displayed form. */
  char: string
  /** Its level in this region's source list. */
  tier: number
  /** Whether the list enters it directly or only glosses it in brackets. */
  kind: 'primary' | 'glossed'
}

export interface UncertainRelation {
  /** The other row whose relationship to this row needs more evidence. */
  key: string
  /** The regional form that caused the two rows to be compared. */
  char: string
  /** Regions whose conversion data produced that form. */
  regions: Region[]
}

export interface CharRow {
  /** Orthodox (traditional) form; row identity and the /char/[key] segment. */
  key: string
  /** The character each region actually uses. */
  chars: RegionalTuple<string>
  /**
   * Japan's pre-reform form, present only when Japan writes a shinjitai. It is
   * the row key when JPShinjitaiCharacters explicitly maps that key to the
   * Japanese column. It joins the comparison as a sixth column: its `glyph`
   * is a group of the same partition, numbered beyond the five when it is
   * written like none of them.
   */
  old?: { char: string; glyph: number; strokes: number; freq?: number }
  /**
   * Other orthodox forms naming this same group -- 脣 for the row keyed 唇.
   * They stay searchable and keep working as an address; the key is the form
   * the five regions actually write.
   */
  aka?: string[]
  /**
   * Listed regional forms accounted for by this row but not selected for its
   * five display columns. For example, mainland `祕` remains searchable here
   * while the column displays the more common level-1 `秘`.
   */
  alternatives?: Partial<Record<Region, ListedAlternative[]>>
  /**
   * Conservative, bidirectional links to groups that conversion data might
   * connect, but that the regional lists do not corroborate strongly enough
   * to merge. These are display-only: they are not names or forms of the row.
   */
  uncertain?: UncertainRelation[]
  /** Codepoint partition signature; "00000" when all five share a codepoint. */
  cp: string
  /**
   * Glyph partition signature: how many distinct ways of writing the character
   * the five regions use.
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
  strokes: RegionalTuple<number>
  /**
   * Three bits per COLUMNS entry. Zero means unavailable; every other value is
   * one plus the index of that column's row-local, deduplicated stroke variant.
   * HK points at the matching TW/CN/JP/KR variant it borrows.
   */
  strokeMap?: number
  /**
   * Character-frequency rank per region, lower is more common. Values are in
   * REGIONS order; null means the regional corpus does not rank this form.
   * Korea has no frequency corpus and is therefore always null.
   */
  freq?: RegionalTuple<number | null>
  /** Listing level per region: cn 0-3, hk 0/1, tw 0 none / 1 common /
   * 2 secondary, jp 0 none / 1 joyo / 2 kyoiku, kr 0/1 basic hanja. */
  tier: RegionalTuple<number>
  /** How each selected regional form appears in that region's source lists. */
  listing: RegionalTuple<'primary' | 'glossed' | 'unlisted'>
  /** How many regions list it among their common characters, 1-5. */
  common: number
  /** Readings per language; absent languages simply have no entry. */
  readings?: {
    mandarin?: string[]
    cantonese?: string[]
    on?: string[]
    kun?: string[]
    korean?: string[]
  }
}

export interface Stats {
  /** Han codepoints covered by Noto in all five regions. */
  cmapTotal: number
  /** Of those, how many differ between the five regions. */
  cmapDiffer: number
  /** Rows actually listed. */
  rows: number
  /** Of those, how many are written identically in all five regions. */
  identical: number
  /** Of those, how many differ in all five regions. */
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
