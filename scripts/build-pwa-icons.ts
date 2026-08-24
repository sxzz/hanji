import { Buffer } from 'node:buffer'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const ROOT = resolve(import.meta.dirname, '..')
const SOURCE = resolve(ROOT, 'public/logo-seal.svg')
const OUTPUT_DIR = resolve(ROOT, 'public/pwa')
const PROOF_RED = '#d1503f'

interface PwaIcon {
  background?: string
  file: string
  size: number
}

const ICONS = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  {
    background: PROOF_RED,
    file: 'maskable-icon-512.png',
    size: 512,
  },
  {
    background: PROOF_RED,
    file: 'apple-touch-icon-180.png',
    size: 180,
  },
] as const satisfies readonly PwaIcon[]

export function renderPwaIcon(source: Buffer, icon: PwaIcon): Promise<Buffer> {
  let pipeline = sharp(source).resize(icon.size, icon.size, {
    fit: 'contain',
  })
  if (icon.background)
    pipeline = pipeline.flatten({ background: icon.background })
  return pipeline.png({ compressionLevel: 9, palette: true }).toBuffer()
}

export async function buildPwaIcons(): Promise<void> {
  const source = await readFile(SOURCE)
  if (!source.includes(Buffer.from(`fill="${PROOF_RED}"`)))
    throw new Error(`Expected ${SOURCE} to use proof red ${PROOF_RED}`)

  await mkdir(OUTPUT_DIR, { recursive: true })
  await Promise.all(
    ICONS.map(async (icon) => {
      const image = await renderPwaIcon(source, icon)
      await writeFile(resolve(OUTPUT_DIR, icon.file), image)
    }),
  )
}

if (import.meta.main) await buildPwaIcons()
