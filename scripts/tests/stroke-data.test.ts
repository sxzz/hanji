import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  loadAnimCJK,
  mergeStrokeOrderChoices,
} from '../../app/utils/animcjk.ts'
import { strokeDataUrl, strokeDuration } from '../../app/utils/stroke-data.ts'

describe('stroke data', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses Vite-built row-group shards', () => {
    expect(strokeDataUrl('説')).toContain('0c')
    expect(strokeDataUrl('説')).not.toBe('/strokes/0c.json')
  })

  it('fetches a shard once when loading multiple forms from one group', async () => {
    const body = {
      _meta: { version: 6 },
      groups: {
        時: {
          variants: [
            {
              medians: [[0, 512, 1024, 512]],
              outlines: ['M0 500L1024 500'],
            },
            {
              medians: [[0, 500, 1024, 500]],
              outlines: ['M0 488L1024 488'],
            },
          ],
        },
      },
    }
    const fetcher = vi.fn(() => Promise.resolve(Response.json(body)))
    vi.stubGlobal('fetch', fetcher)

    const [chinese, japanese] = await Promise.all([
      loadAnimCJK(0, '時'),
      loadAnimCJK(1, '時'),
    ])

    expect(chinese?.strokes).toHaveLength(1)
    expect(japanese?.strokes).toHaveLength(1)
    expect(fetcher).toHaveBeenCalledOnce()
    expect(fetcher).toHaveBeenCalledWith(strokeDataUrl('時'))
  })

  it('merges visible regions that share one geometry variant', () => {
    expect(
      mergeStrokeOrderChoices('時', [
        {
          column: 'cn',
          char: '时',
          data: { char: '时', region: 'cn', variant: 0 },
        },
        {
          column: 'jp',
          char: '時',
          data: { char: '時', region: 'jp', variant: 1 },
        },
        {
          column: 'hk',
          char: '時',
          data: { char: '時', region: 'tw', variant: 1 },
        },
        {
          column: 'tw',
          char: '時',
          data: { char: '時', region: 'tw', variant: 1 },
        },
      ]),
    ).toEqual([
      {
        column: 'cn',
        columns: ['cn'],
        char: '时',
        groupKey: '時',
        variant: 0,
      },
      {
        column: 'jp',
        columns: ['jp', 'hk', 'tw'],
        char: '時',
        groupKey: '時',
        variant: 1,
      },
    ])
  })

  it('keeps animation timing within its readable range', () => {
    expect(strokeDuration(1)).toBe(360)
    expect(strokeDuration(60)).toBe(540)
    expect(strokeDuration(1_000)).toBe(780)
  })

  it('normalizes animation timing across coordinate systems', () => {
    const smallCanvasLength = 60
    const largeCanvasLength = smallCanvasLength * (1024 / 109)

    expect(strokeDuration(largeCanvasLength, 1024)).toBe(
      strokeDuration(smallCanvasLength, 109),
    )
    expect(strokeDuration(largeCanvasLength, 1024)).toBe(540)
  })
})
