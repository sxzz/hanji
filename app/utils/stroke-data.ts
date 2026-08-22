import {
  STROKE_DATA_VERSION,
  strokeShardId,
  type PackedStrokeGroup,
  type PackedStrokeShard,
} from '#shared/strokes.ts'

export const strokeDataUrl = (groupKey: string): string =>
  `/strokes/${strokeShardId(groupKey)}.json`

function isShard(value: unknown): value is PackedStrokeShard {
  if (!value || typeof value !== 'object') return false
  const shard = value as Partial<PackedStrokeShard>
  return Boolean(
    shard._meta &&
    typeof shard._meta === 'object' &&
    shard._meta.version === STROKE_DATA_VERSION &&
    shard.groups &&
    typeof shard.groups === 'object',
  )
}

/** Every regional form in a row resolves through the same local shard URL. */
export async function loadStrokeShard(
  groupKey: string,
  signal?: AbortSignal,
): Promise<PackedStrokeShard> {
  const url = strokeDataUrl(groupKey)
  const response = signal ? await fetch(url, { signal }) : await fetch(url)
  if (!response.ok) throw new Error(`stroke shard returned ${response.status}`)
  const shard: unknown = await response.json()
  if (!isShard(shard)) throw new Error('invalid stroke shard')
  return shard
}

export async function loadStrokeGroup(
  groupKey: string,
  signal?: AbortSignal,
): Promise<PackedStrokeGroup | undefined> {
  const shard = await loadStrokeShard(groupKey, signal)
  return shard.groups[groupKey]
}

/** Long sweeps take visibly longer than dots, within a calm readable range. */
export const strokeDuration = (
  length: number,
  coordinateWidth = 109,
): number => {
  // Normalize path length to the original 109-unit timing calibration so the
  // duration depends on its proportion of the board, not source coordinates.
  const normalizedLength =
    coordinateWidth > 0 ? length * (109 / coordinateWidth) : length
  return Math.round(Math.max(360, Math.min(780, normalizedLength * 9)))
}
