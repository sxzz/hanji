import type { Column } from '~~/shared/types.ts'

/**
 * Accent for a glyph group. The accents encode grouping and never region
 * identity, so the same group number always reaches for the same variable
 * whether it is drawn as a stacked layer, a run under a row, or a segment in
 * a chip. A caller with only one group has nothing to encode and picks its own
 * neutral instead.
 */
export const groupColor = (group: number) => `var(--c-g${group + 1})`

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
