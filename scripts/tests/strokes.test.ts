import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ANIMCJK_SOURCE_BASELINE,
  ANIMCJK_SOURCE_SIZE,
  ANIMCJK_TRANSFORM,
  ANIMCJK_VIEW_BOX,
  animCJKMedianPath,
  unpackAnimCJK,
} from '../../app/utils/animcjk.ts'
import {
  setStrokeVariant,
  STROKE_SHARD_COUNT,
  strokeDataRef,
  strokeShardId,
  type AnimCJKRegion,
  type PackedStrokeShard,
} from '../../shared/strokes.ts'
import { COLUMNS, type CharRow, type CharsData } from '../../shared/types.ts'
import { parseAnimCJKGraphics } from '../build-strokes.ts'
import { DATA_DIR, STROKE_DIR } from '../sources.ts'

describe('stroke source parsing', () => {
  it('keeps selected AnimCJK outlines and flattens their medians', () => {
    const graphics = parseAnimCJKGraphics(
      [
        JSON.stringify({
          character: '一',
          strokes: ['M0 500L1024 500'],
          medians: [
            [
              [0, 512],
              [1024, 512],
            ],
          ],
        }),
        JSON.stringify({
          character: '二',
          strokes: ['M0 0L1 1'],
          medians: [
            [
              [0, 0],
              [1, 1],
            ],
          ],
        }),
      ].join('\n'),
      new Set(['一']),
    )
    expect(graphics).toEqual(
      new Map([
        [
          '一',
          {
            medians: [[0, 512, 1024, 512]],
            outlines: ['M0 500L1024 500'],
          },
        ],
      ]),
    )
  })

  it('restores source medians and official clipped-animation geometry', () => {
    expect(animCJKMedianPath([0, 900, 1024, 0])).toBe('M0 900L1024 0')
    expect(() => animCJKMedianPath([0, 1, 2])).toThrow('invalid')
    expect(
      unpackAnimCJK({
        medians: [[0, 512, 1024, 512]],
        outlines: ['M0 500L1024 500'],
      }),
    ).toEqual({
      revealWidth: 128,
      transform: ANIMCJK_TRANSFORM,
      viewBox: ANIMCJK_VIEW_BOX,
      strokes: [
        {
          d: 'M0 512L1024 512',
          order: 1,
          outline: 'M0 500L1024 500',
        },
      ],
    })
  })

  it('resolves HK stroke sources in TW, CN, JP, KR priority order', () => {
    const row: CharRow = {
      key: '港',
      chars: ['陆', '港', '臺', '日', '韓'],
      cp: '01234',
      glyph: '00000',
      strokes: [1, 1, 1, 1, 1],
      tier: [0, 0, 0, 0, 0],
      listing: ['unlisted', 'unlisted', 'unlisted', 'unlisted', 'unlisted'],
      common: 0,
    }
    const useSources = (regions: readonly AnimCJKRegion[]) => {
      let strokeMap = 0
      for (const [variant, region] of regions.entries())
        strokeMap = setStrokeVariant(strokeMap, region, variant)
      row.strokeMap = setStrokeVariant(strokeMap, 'hk', 0)
    }

    useSources(['tw', 'cn', 'jp', 'kr'])
    expect(strokeDataRef(row, 'hk')).toEqual({
      char: '臺',
      region: 'tw',
      variant: 0,
    })

    useSources(['cn', 'jp', 'kr'])
    expect(strokeDataRef(row, 'hk')).toEqual({
      char: '陆',
      region: 'cn',
      variant: 0,
    })
    useSources(['jp', 'kr'])
    expect(strokeDataRef(row, 'hk')).toEqual({
      char: '日',
      region: 'jp',
      variant: 0,
    })
    useSources(['kr'])
    expect(strokeDataRef(row, 'hk')).toEqual({
      char: '韓',
      region: 'kr',
      variant: 0,
    })
  })
})

describe('generated stroke shards', () => {
  const files = readdirSync(STROKE_DIR)
    .filter((file) => file.endsWith('.json'))
    .toSorted()
  const shards = files.map(
    (file) =>
      JSON.parse(
        readFileSync(join(STROKE_DIR, file), 'utf8'),
      ) as PackedStrokeShard,
  )
  const charsData = JSON.parse(
    readFileSync(join(DATA_DIR, 'chars.json'), 'utf8'),
  ) as CharsData
  const rows = new Map(charsData.rows.map((row) => [row.key, row]))

  it('uses a fixed small number of files', () => {
    expect(files).toHaveLength(STROKE_SHARD_COUNT)
    expect(files.toSorted()).toEqual(
      Array.from(
        { length: STROKE_SHARD_COUNT },
        (_, index) => `${index.toString(16).padStart(2, '0')}.json`,
      ),
    )
  })

  it('puts every group in its deterministic shard with the AnimCJK notice', () => {
    for (const [index, shard] of shards.entries()) {
      expect(shard._meta).toMatchObject({
        modifiedAt: '2026-08-23',
        version: 6,
        sources: {
          animcjk: { license: 'Arphic Public License' },
        },
      })
      expect(Object.keys(shard._meta.sources)).toEqual(['animcjk'])
      for (const groupKey of Object.keys(shard.groups))
        expect(Number.parseInt(strokeShardId(groupKey), 16)).toBe(index)
    }
    expect(existsSync(join(STROKE_DIR, 'licenses', 'animcjk-APL.txt'))).toBe(
      true,
    )
    expect(
      existsSync(join(STROKE_DIR, 'licenses', 'animcjk-COPYING.txt')),
    ).toBe(true)
  })

  it('keeps every transformed AnimCJK median inside its source viewBox', () => {
    const outside: { character: string; x: number; y: number }[] = []
    for (const shard of shards)
      for (const [character, group] of Object.entries(shard.groups))
        for (const packed of group.variants)
          for (const points of packed.medians)
            for (let index = 0; index < points.length; index += 2) {
              const x = points[index]!
              const y = ANIMCJK_SOURCE_BASELINE - points[index + 1]!
              if (
                x < 0 ||
                x > ANIMCJK_SOURCE_SIZE ||
                y < 0 ||
                y > ANIMCJK_SOURCE_SIZE
              )
                outside.push({ character, x, y })
            }
    expect(outside).toEqual([])
  })

  it('stores usable AnimCJK outline and median geometry for every region', () => {
    for (const shard of shards)
      for (const group of Object.values(shard.groups))
        for (const packed of group.variants) {
          expect(packed.medians.length).toBeGreaterThan(0)
          expect(packed.outlines).toHaveLength(packed.medians.length)
          expect(packed.outlines.every((path) => /^\s*m/i.test(path))).toBe(
            true,
          )
        }
  })

  it('covers every character listed by the Japanese source lists', () => {
    const missing = charsData.rows
      .filter(
        (row) => row.listing[3] !== 'unlisted' && !strokeDataRef(row, 'jp'),
      )
      .map((row) => row.chars[3])
    expect(missing).toEqual([])
  })

  it('deduplicates row geometry and maps every available column to it', () => {
    let packedGroups = 0
    for (const shard of shards)
      for (const [groupKey, group] of Object.entries(shard.groups)) {
        packedGroups++
        const row = rows.get(groupKey)
        expect(row).toBeDefined()
        expect(
          new Set(group.variants.map((data) => JSON.stringify(data))).size,
        ).toBe(group.variants.length)
        const refs = COLUMNS.flatMap((column) => {
          const ref = strokeDataRef(row!, column)
          return ref ? [ref] : []
        })
        expect(new Set(refs.map((ref) => ref.variant)).size).toBe(
          group.variants.length,
        )
        for (const ref of refs)
          expect(group.variants[ref.variant]).toBeDefined()
      }

    expect(packedGroups).toBeGreaterThan(0)
    expect(packedGroups).toBeLessThanOrEqual(charsData.rows.length)

    const timeShard = shards[Number.parseInt(strokeShardId('時'), 16)]!
    const time = timeShard.groups['時']!
    const timeRow = rows.get('時')!
    const cn = strokeDataRef(timeRow, 'cn')!
    const hk = strokeDataRef(timeRow, 'hk')!
    const tw = strokeDataRef(timeRow, 'tw')!
    const jp = strokeDataRef(timeRow, 'jp')!
    expect(time.variants[cn.variant]).toBeDefined()
    expect(tw.variant).toBe(jp.variant)
    expect(hk.variant).toBe(tw.variant)
    expect(cn.variant).not.toBe(tw.variant)
  })

  it('records direct availability and hides regions without data', () => {
    const one = rows.get('一')!
    expect(strokeDataRef(one, 'hk')).toMatchObject({
      char: '一',
      region: 'tw',
    })
    expect(strokeDataRef(rows.get('骨')!, 'tw')).toBeUndefined()
  })
})
