import { Buffer } from 'node:buffer'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  ANIMCJK_REGIONS,
  HK_STROKE_FALLBACK,
  setStrokeVariant,
  STROKE_DATA_VERSION,
  STROKE_SHARD_COUNT,
  strokeShardId,
  strokeVariantIndex,
  type AnimCJKRegion,
  type PackedAnimCJK,
  type PackedMedians,
  type PackedStrokeGroup,
  type PackedStrokeShard,
} from '../shared/strokes.ts'
import { COLUMNS, REGIONS, type CharRow, type Column } from '../shared/types.ts'
import { NOTICES_DIR, raw, rawText, STROKE_DIR } from './sources.ts'

const MODIFIED_AT = '2026-08-23'
const ANIMCJK_HOME = 'https://github.com/parsimonhi/animCJK'
const ANIMCJK_LICENSE_PATH = '/notices/animcjk-APL.txt'

const GRAPHICS_SOURCE: Record<AnimCJKRegion, string> = {
  cn: 'strokes/animcjk-zh-hans.txt',
  tw: 'strokes/animcjk-zh-hant.txt',
  jp: 'strokes/animcjk-ja.txt',
  kr: 'strokes/animcjk-ko.txt',
}

const DIRECT_STROKE_COLUMNS = COLUMNS.filter(
  (column) => column !== 'hk',
) as Exclude<Column, 'hk'>[]

interface AnimCJKRecord {
  character?: unknown
  medians?: unknown
  strokes?: unknown
}

function packMedians(value: unknown, character: string): PackedMedians {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error(`AnimCJK ${character} has no medians`)

  return value.map((stroke, strokeIndex) => {
    if (!Array.isArray(stroke) || stroke.length < 2)
      throw new Error(
        `AnimCJK ${character} stroke ${strokeIndex + 1} has too few points`,
      )
    const packed: number[] = []
    for (const point of stroke) {
      if (
        !Array.isArray(point) ||
        point.length !== 2 ||
        point.some((coordinate) => !Number.isFinite(coordinate))
      )
        throw new Error(
          `AnimCJK ${character} stroke ${strokeIndex + 1} has an invalid point`,
        )
      packed.push(Number(point[0]), Number(point[1]))
    }
    return packed
  })
}

function packOutlines(value: unknown, character: string): string[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error(`AnimCJK ${character} has no outlines`)

  return value.map((outline, strokeIndex) => {
    if (
      typeof outline !== 'string' ||
      !/^\s*m/i.test(outline) ||
      /[<>]/.test(outline)
    )
      throw new Error(
        `AnimCJK ${character} stroke ${strokeIndex + 1} has an invalid outline`,
      )
    return outline
  })
}

/** Read only selected characters, retaining the official clipped-animation data. */
export function parseAnimCJKGraphics(
  source: string,
  selected: ReadonlySet<string>,
): Map<string, PackedAnimCJK> {
  const out = new Map<string, PackedAnimCJK>()
  for (const [index, line] of source.split('\n').entries()) {
    if (!line.trim()) continue
    let record: AnimCJKRecord
    try {
      record = JSON.parse(line) as AnimCJKRecord
    } catch {
      throw new Error(`invalid AnimCJK JSON on line ${index + 1}`)
    }
    if (
      typeof record.character !== 'string' ||
      Array.from(record.character).length !== 1
    )
      throw new Error(`invalid AnimCJK character on line ${index + 1}`)
    if (!selected.has(record.character)) continue
    if (out.has(record.character))
      throw new Error(`duplicate AnimCJK character: ${record.character}`)
    const medians = packMedians(record.medians, record.character)
    const outlines = packOutlines(record.strokes, record.character)
    if (medians.length !== outlines.length)
      throw new Error(`AnimCJK ${record.character} stroke count mismatch`)
    out.set(record.character, { medians, outlines })
  }
  return out
}

const compareCharacters = (left: string, right: string) =>
  left.codePointAt(0)! - right.codePointAt(0)!

function wantedCharacters(rows: readonly CharRow[]) {
  const wanted = Object.fromEntries(
    ANIMCJK_REGIONS.map((region) => [region, new Set<string>()]),
  ) as Record<AnimCJKRegion, Set<string>>

  const cn = REGIONS.indexOf('cn')
  const tw = REGIONS.indexOf('tw')
  const jp = REGIONS.indexOf('jp')
  const kr = REGIONS.indexOf('kr')
  for (const row of rows) {
    wanted.cn.add(row.chars[cn]!)
    wanted.tw.add(row.chars[tw]!)
    wanted.jp.add(row.chars[jp]!)
    wanted.kr.add(row.chars[kr]!)
    if (row.old) wanted.jp.add(row.old.char)
  }
  return wanted
}

export async function buildStrokeData(rows: readonly CharRow[]): Promise<void> {
  const wanted = wantedCharacters(rows)

  const graphics = Object.fromEntries(
    await Promise.all(
      ANIMCJK_REGIONS.map(async (region) => [
        region,
        parseAnimCJKGraphics(
          await rawText(GRAPHICS_SOURCE[region]),
          wanted[region],
        ),
      ]),
    ),
  ) as Record<AnimCJKRegion, Map<string, PackedAnimCJK>>

  const shards = Array.from(
    { length: STROKE_SHARD_COUNT },
    () => new Map<string, PackedStrokeGroup>(),
  )
  for (const row of rows) {
    const group: PackedStrokeGroup = { variants: [] }
    const variants = new Map<string, number>()
    let strokeMap = 0

    for (const column of DIRECT_STROKE_COLUMNS) {
      const region: AnimCJKRegion = column === 'old' ? 'jp' : column
      const character =
        column === 'old' ? row.old?.char : row.chars[REGIONS.indexOf(column)]
      if (!character) continue
      const data = graphics[region].get(character)
      if (!data) continue

      const outlineKey = JSON.stringify(data.outlines)
      let variant = variants.get(outlineKey)
      if (variant === undefined) {
        variant = group.variants.length
        variants.set(outlineKey, variant)
        group.variants.push(data)
      }
      strokeMap = setStrokeVariant(strokeMap, column, variant)
    }

    const hkIndex = REGIONS.indexOf('hk')
    const hkGlyph = row.glyph[hkIndex]
    for (const region of HK_STROKE_FALLBACK) {
      const index = REGIONS.indexOf(region)
      const variant = strokeVariantIndex(strokeMap, region)
      if (row.glyph[index] !== hkGlyph || variant === undefined) continue
      strokeMap = setStrokeVariant(strokeMap, 'hk', variant)
      break
    }

    // The Unihan chain initializes row.strokes. A resolved stroke-order
    // drawing takes priority everywhere, including the detail page.
    for (const [index, region] of REGIONS.entries()) {
      const variant = strokeVariantIndex(strokeMap, region)
      const count =
        variant === undefined
          ? undefined
          : group.variants[variant]?.outlines.length
      if (count) row.strokes[index] = count
    }
    const oldVariant = strokeVariantIndex(strokeMap, 'old')
    const oldCount =
      oldVariant === undefined
        ? undefined
        : group.variants[oldVariant]?.outlines.length
    if (row.old && oldCount) row.old.strokes = oldCount

    if (group.variants.length > 0) {
      row.strokeMap = strokeMap
      shards[Number.parseInt(strokeShardId(row.key), 16)]!.set(row.key, group)
    } else delete row.strokeMap
  }

  await rm(STROKE_DIR, { force: true, recursive: true })
  await mkdir(STROKE_DIR, { recursive: true })

  let outputBytes = 0
  for (const [index, shard] of shards.entries()) {
    const groups = Object.fromEntries(
      [...shard]
        .toSorted(([left], [right]) => compareCharacters(left, right))
        .map(([groupKey, group]) => [groupKey, group]),
    )
    const output: PackedStrokeShard = {
      _meta: {
        modifiedAt: MODIFIED_AT,
        version: STROKE_DATA_VERSION,
        sources: {
          animcjk: {
            license: 'Arphic Public License',
            licenseUrl: ANIMCJK_LICENSE_PATH,
            modification:
              'Selected only CN, TW, JP, and KR characters referenced by Hanji rows; retained the original stroke outlines and median paths; flattened median point pairs; deduplicated variants with identical ordered stroke outlines within each row, retaining the first matching median set; regrouped records into 32 row-key hash shards. Hong Kong points at a matching regional variant in TW, CN, JP, KR priority order.',
            source: ANIMCJK_HOME,
          },
        },
      },
      groups,
    }
    const serialized = `${JSON.stringify(output)}\n`
    outputBytes += Buffer.byteLength(serialized)
    await writeFile(
      join(STROKE_DIR, `${index.toString(16).padStart(2, '0')}.json`),
      serialized,
    )
  }

  await mkdir(NOTICES_DIR, { recursive: true })
  await Promise.all([
    writeFile(
      join(NOTICES_DIR, 'animcjk-APL.txt'),
      await raw('strokes/animcjk-APL.txt'),
    ),
    writeFile(
      join(NOTICES_DIR, 'animcjk-COPYING.txt'),
      await raw('strokes/animcjk-COPYING.txt'),
    ),
  ])

  const counts = ANIMCJK_REGIONS.map(
    (region) => `${region}=${graphics[region].size}/${wanted[region].size}`,
  ).join(' ')
  console.error(
    `stroke data: animcjk ${counts}; ${STROKE_SHARD_COUNT} shards, ${(outputBytes / 1024 / 1024).toFixed(1)} MB`,
  )
}
