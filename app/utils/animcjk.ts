import { loadStrokeGroup, strokeDataUrl } from './stroke-data.ts'
import type {
  PackedAnimCJK,
  PackedMedians,
  StrokeAnimationData,
  StrokeDataRef,
} from '#shared/strokes.ts'
import type { Column } from '#shared/types.ts'

export interface StrokeOrderChoice {
  /** Stable selector value: the first visible column sharing this geometry. */
  column: Column
  columns: readonly Column[]
  char: string
  groupKey: string
  variant: number
}

export interface StrokeOrderCandidate {
  char: string
  column: Column
  data: StrokeDataRef
}

export const ANIMCJK_HOME = 'https://github.com/parsimonhi/animCJK'
export const ANIMCJK_LICENSE = '/notices/animcjk-APL.txt'

export const ANIMCJK_SOURCE_SIZE = 1024
export const ANIMCJK_SOURCE_BASELINE = 900
export const ANIMCJK_VIEW_BOX = '0 0 1024 1024'
export const ANIMCJK_TRANSFORM = 'matrix(1 0 0 -1 0 900)'
export const ANIMCJK_REVEAL_WIDTH = 128

export const animCJKDataUrl = strokeDataUrl

/** Collapse visible regions that point at the same deduplicated geometry. */
export function mergeStrokeOrderChoices(
  groupKey: string,
  candidates: readonly StrokeOrderCandidate[],
): StrokeOrderChoice[] {
  const choices = new Map<
    number,
    {
      column: Column
      columns: Column[]
      characters: Set<string>
      groupKey: string
      variant: number
    }
  >()

  for (const candidate of candidates) {
    const existing = choices.get(candidate.data.variant)
    if (existing) {
      existing.columns.push(candidate.column)
      existing.characters.add(candidate.char)
      continue
    }

    choices.set(candidate.data.variant, {
      column: candidate.column,
      columns: [candidate.column],
      characters: new Set([candidate.char]),
      groupKey,
      variant: candidate.data.variant,
    })
  }

  return [...choices.values()].map(({ characters, ...choice }) => ({
    ...choice,
    char: [...characters].join('／'),
  }))
}

/** Turn a compact x,y,x,y sequence back into its source median path. */
export function animCJKMedianPath(points: readonly number[]): string {
  if (
    points.length < 4 ||
    points.length % 2 !== 0 ||
    !points.every(Number.isFinite)
  )
    throw new Error('invalid AnimCJK median')

  let path = ''
  for (let index = 0; index < points.length; index += 2) {
    const x = points[index]!
    const y = points[index + 1]!
    path += `${index === 0 ? 'M' : 'L'}${x} ${y}`
  }
  return path
}

export function unpackAnimCJK(
  packed: PackedAnimCJK | undefined,
): StrokeAnimationData | undefined {
  const medians: PackedMedians | undefined = packed?.medians
  if (
    !medians?.length ||
    !packed?.outlines.length ||
    medians.length !== packed.outlines.length
  )
    return undefined

  return {
    viewBox: ANIMCJK_VIEW_BOX,
    transform: ANIMCJK_TRANSFORM,
    revealWidth: ANIMCJK_REVEAL_WIDTH,
    strokes: medians.map((points, index) => ({
      d: animCJKMedianPath(points),
      outline: packed.outlines[index]!,
      order: index + 1,
    })),
  }
}

export async function loadAnimCJK(
  variant: number,
  groupKey: string,
): Promise<StrokeAnimationData | undefined> {
  if (!Number.isInteger(variant) || variant < 0) return undefined
  const group = await loadStrokeGroup(groupKey)
  return unpackAnimCJK(group?.variants[variant])
}
