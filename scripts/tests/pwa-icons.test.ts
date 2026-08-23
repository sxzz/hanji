import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '../..')
const PROOF_RED = [0xd1, 0x50, 0x3f, 0xff]

async function pixel(file: string, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(resolve(ROOT, 'public/pwa', file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const offset = (y * info.width + x) * info.channels
  return [...data.subarray(offset, offset + info.channels)]
}

describe('PWA app icons', () => {
  it('keeps the proof-red seal as the only icon source', async () => {
    const source = await readFile(resolve(ROOT, 'public/logo-seal.svg'), 'utf8')
    expect(source).toContain('fill="#d1503f"')
  })

  it.each([
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['maskable-icon-512.png', 512],
    ['apple-touch-icon-180.png', 180],
  ])('generates %s at %d×%d', async (file, size) => {
    const metadata = await sharp(resolve(ROOT, 'public/pwa', file)).metadata()
    expect(metadata.width).toBe(size)
    expect(metadata.height).toBe(size)
    expect(metadata.format).toBe('png')
  })

  it('preserves rounded transparency on ordinary manifest icons', async () => {
    expect((await pixel('icon-512.png', 0, 0)).at(-1)).toBe(0)
    expect(await pixel('icon-512.png', 256, 4)).toEqual(PROOF_RED)
  })

  it.each(['maskable-icon-512.png', 'apple-touch-icon-180.png'])(
    'fills the %s safe area with proof red',
    async (file) => {
      expect(await pixel(file, 0, 0)).toEqual(PROOF_RED)
    },
  )
})

describe('PWA install screenshots', () => {
  it.each([
    ['screenshot-wide.png', 1280, 720],
    ['screenshot-narrow.png', 390, 844],
  ])('provides %s at %d×%d', async (file, width, height) => {
    const metadata = await sharp(resolve(ROOT, 'public/pwa', file)).metadata()
    expect(metadata.width).toBe(width)
    expect(metadata.height).toBe(height)
    expect(metadata.format).toBe('png')
  })
})
