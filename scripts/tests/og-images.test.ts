import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { createOgRenderer, type OgRenderer } from '../build-og-images.ts'
import type { CharsData } from '../../shared/types.ts'

const data: CharsData = JSON.parse(
  readFileSync(
    new URL('../../app/assets/data/chars.json', import.meta.url),
    'utf8',
  ),
)
let renderer: OgRenderer

beforeAll(async () => {
  renderer = await createOgRenderer(data)
})

describe('build-time OG rendering', () => {
  it('renders the home and About cards as CSS-generated SVG', async () => {
    const home = await renderer.renderHomeSvg()
    const alternateHome = await renderer.renderHomeSvg('text-left')
    for (const svg of [home, alternateHome, await renderer.renderAboutSvg()]) {
      expect(svg).toMatch(/^<!-- .+ -->\n<svg width="\d+" height="\d+"/)
      expect(svg).not.toContain('<text')
    }
    expect(alternateHome).not.toBe(home)
  })

  it('renders regional glyph outlines and produces an indexed PNG', async () => {
    const row = data.rows.find(({ key }) => key === '骨')!
    const svg = await renderer.renderCharacterSvg(row)
    const png = await renderer.renderPng(svg)

    expect(svg.match(/<path /g)?.length).toBeGreaterThanOrEqual(8)
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
    // Byte 25 is the IHDR colour type; 3 keeps the flat proof-sheet art indexed.
    expect(png[25]).toBe(3)
    expect(png.includes(Buffer.from('tEXtSoftware\0'))).toBe(true)
  })
})
