import {
  FREQUENCY_REGIONS,
  REGIONS,
  type CharRow,
  type FrequencyRegion,
} from './types.ts'

/** The selected regional form's frequency rank, or null when unranked. */
export function frequencyRankOf(
  row: CharRow,
  region: FrequencyRegion,
): number | null {
  return row.freq?.[REGIONS.indexOf(region)] ?? null
}

/** Runtime guard shared by the URL-backed frequency-region control. */
export function isFrequencyRegion(value: string): value is FrequencyRegion {
  return (FREQUENCY_REGIONS as readonly string[]).includes(value)
}
