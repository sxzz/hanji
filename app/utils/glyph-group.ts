import type { Column } from '~~/shared/types.ts'

/**
 * Accent for a glyph group.
 *
 * The first group is the baseline -- the form the leading column on show
 * writes -- and is drawn in ink. Every later group is a departure from it, and
 * takes an accent.
 *
 * That asymmetry is what makes an overprint readable. The blend keeps the
 * strongest mark at every point, and the accents are calibrated to lose that
 * contest against ink -- so an accent landing on the baseline leaves it
 * exactly as it was, and shows its own color only where it parts company. The
 * stack resolves into one legible character with its disagreements picked out,
 * rather than four saturated shapes competing for the same square. Giving
 * every group its own accent left the eye nowhere to land, and past three
 * groups the overlaps silted up into a single dark mass.
 *
 * The accents still encode grouping and never region identity, so the same
 * group number reaches for the same variable whether it is drawn as a stacked
 * layer, a run under a row, or a segment in a chip.
 */
export const groupColor = (group: number) =>
  group === 0 ? 'var(--c-ink)' : `var(--c-g${group})`

/**
 * BCP-47 tag per column. This is accessibility semantics, unrelated to the
 * interface language; it also drives the system's own CJK fallback when a
 * subset has not loaded. The kyujitai is Japan's own, so it is tagged as
 * Japanese too.
 */
export const COLUMN_LANG: Record<Column, string> = {
  cn: 'zh-CN',
  hk: 'zh-HK',
  tw: 'zh-TW',
  jp: 'ja',
  kr: 'ko',
  old: 'ja',
}
