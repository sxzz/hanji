import { varietyOf } from './row.ts'

/**
 * A broad pattern choice: `v2` means every partition with two distinct forms.
 * Exact choices keep using their partition signature (`0001`, `0112`, ...),
 * so existing shared URLs continue to mean exactly what they did before.
 */
const VARIETY_CHOICE = /^v([1-9]\d*)$/

/**
 * Every non-identical variety is on by default, including the fifth form that
 * becomes applicable when the opt-in Korean column is shown. Choices that need
 * more columns than are currently visible stay serialized but do not filter.
 */
export const DEFAULT_PATTERN_CHOICES = ['v2', 'v3', 'v4', 'v5'] as const
export const ALL_PATTERN_CHOICES = 'all'

export const varietyChoice = (variety: number): string => `v${variety}`

export function choiceVariety(choice: string): number | undefined {
  const match = VARIETY_CHOICE.exec(choice)
  return match ? Number(match[1]) : undefined
}

/** Does one broad or exact choice include this partition? */
export function patternChoiceMatches(
  signature: string,
  choice: string,
): boolean {
  const variety = choiceVariety(choice)
  return variety === undefined
    ? choice === signature
    : variety === varietyOf(signature)
}

/** A row passes when any currently applicable choice includes its partition. */
export const patternChoicesMatch = (
  signature: string,
  choices: readonly string[],
): boolean => choices.some((choice) => patternChoiceMatches(signature, choice))

/**
 * Choices made for hidden columns stay serialized but do not filter the table.
 * Exact signatures are scoped by their length; broad choices are available
 * only when that many forms can exist among the columns currently on show.
 */
export function applicablePatternChoices(
  choices: readonly string[],
  availablePatterns: readonly string[],
): string[] {
  const exact = new Set(availablePatterns)
  const varieties = new Set(availablePatterns.map(varietyOf))
  return choices.filter((choice) => {
    const variety = choiceVariety(choice)
    return variety === undefined ? exact.has(choice) : varieties.has(variety)
  })
}

/**
 * The group button switches between a broad choice and no choice. When exact
 * children are selected, pressing it replaces those children with the broad
 * choice instead, which reads as “all patterns with N forms”.
 */
export function toggleVarietyChoice(
  choices: readonly string[],
  variety: number,
  groupPatterns: readonly string[],
): string[] {
  const chosen = new Set(choices)
  const broad = varietyChoice(variety)
  if (chosen.has(broad)) chosen.delete(broad)
  else {
    for (const pattern of groupPatterns) chosen.delete(pattern)
    chosen.add(broad)
  }
  return [...chosen].toSorted()
}

/** Choosing a child turns a broad group into a precise selection. */
export function toggleExactPatternChoice(
  choices: readonly string[],
  signature: string,
): string[] {
  const chosen = new Set(choices)
  if (chosen.has(signature)) chosen.delete(signature)
  else {
    chosen.delete(varietyChoice(varietyOf(signature)))
    chosen.add(signature)
  }
  return [...chosen].toSorted()
}

/** `all` is the explicit URL spelling for no pattern filter. */
export function parsePatternChoices(raw: string): string[] {
  if (raw === ALL_PATTERN_CHOICES) return []
  return [...new Set(raw.split(',').filter(Boolean))].toSorted()
}

export function serializePatternChoices(choices: readonly string[]): string {
  return choices.length
    ? [...new Set(choices)].toSorted().join(',')
    : ALL_PATTERN_CHOICES
}
