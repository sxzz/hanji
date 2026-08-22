import {
  STROKE_DATA_VERSION,
  strokeShardId,
  type PackedStrokeGroup,
  type PackedStrokeShard,
} from '#shared/strokes.ts'

const strokeAssetUrls = import.meta.glob<string>('../assets/strokes/*.json', {
  eager: true,
  import: 'default',
  query: '?url&no-inline',
})

const shardRequests = new Map<string, Promise<PackedStrokeShard>>()

export function strokeDataUrl(groupKey: string): string {
  const shard = strokeShardId(groupKey)
  const url = strokeAssetUrls[`../assets/strokes/${shard}.json`]
  if (!url)
    throw new Error(`missing stroke shard ${shard}; run pnpm build:data first`)
  return url
}

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
): Promise<PackedStrokeShard> {
  const url = strokeDataUrl(groupKey)
  const existing = shardRequests.get(url)
  if (existing) return existing

  const request = (async () => {
    const response = await fetch(url)
    if (!response.ok)
      throw new Error(`stroke shard returned ${response.status}`)
    const shard: unknown = await response.json()
    if (!isShard(shard)) throw new Error('invalid stroke shard')
    return shard
  })()
  shardRequests.set(url, request)

  try {
    return await request
  } catch (error) {
    shardRequests.delete(url)
    throw error
  }
}

export async function loadStrokeGroup(
  groupKey: string,
): Promise<PackedStrokeGroup | undefined> {
  const shard = await loadStrokeShard(groupKey)
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
