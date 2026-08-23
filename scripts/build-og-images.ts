/**
 * THESIS: An OG card is a compact comparative proof, not a screenshot of the
 * page. Its largest object is always a real regional glyph comparison.
 * OWN-WORLD: Warm paper, cool ink, hairline guides, and grouped registration
 * colors inherited from the app; color describes form groups, never regions.
 * STORY: Home names the promise, About names the method, and a character card
 * shows the evidence before it says anything about it.
 * FIRST VIEWPORT: 1200 × 630, generous type at left or right, with the glyph
 * specimen occupying roughly half the frame and a Taiwan plate in the margin.
 * FORM: The established Comparative Proof Sheet, extended to social images.
 */
import { Buffer } from 'node:buffer'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  isMainThread,
  parentPort,
  Worker,
  workerData,
} from 'node:worker_threads'
import { Resvg } from '@resvg/resvg-js'
import * as fontkit from 'fontkit'
import satori, { type Font as SatoriFont } from 'satori'
import { createElement, type JSXNode } from 'satori/jsx'
import sharp from 'sharp'
import subsetFont from 'subset-font'
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '../shared/brand.ts'
import {
  OVERPRINT_PLATE_SRGB,
  overprintOpacity,
  overprintPlateIndex,
} from '../shared/overprint.ts'
import {
  fontRegionOf,
  projectSignature,
  usesSupplementalFont,
} from '../shared/row.ts'
import {
  REGIONS,
  type CharRow,
  type CharsData,
  type Region,
} from '../shared/types.ts'
import { DATA_DIR, raw, ROOT } from './sources.ts'
import type { Font } from 'fontkit'

const COLORS = {
  ink: '#16151a',
  soft: '#4a4852',
  mute: '#86838d',
  paper: '#fbfaf7',
  sunk: '#f2f0ea',
  rule: '#dfdcd4',
  red: '#d1503f',
  blue: '#3f72bd',
  ochre: '#b8871f',
  violet: '#8d5cb4',
} as const

const GROUP_COLORS = [
  COLORS.ink,
  COLORS.red,
  COLORS.blue,
  COLORS.ochre,
  COLORS.violet,
] as const

const CJK_FAMILY = 'Hanji OG Serif CJK'
const LATIN_FAMILY = 'Hanji OG Serif Latin'
const MONO_FAMILY = 'Hanji OG Mono'
const GLYPH_VIEW_BOX = '0 -880 1000 1000'
const OG_REGIONS = ['cn', 'jp', 'hk', 'tw'] as const
const REGION_LABELS: Record<(typeof OG_REGIONS)[number], string> = {
  cn: '中國大陸',
  jp: '日本',
  hk: '香港',
  tw: '臺灣',
}
const REGION_CODES: Record<(typeof OG_REGIONS)[number], string> = {
  cn: 'CN',
  jp: 'JP',
  hk: 'HK',
  tw: 'TW',
}

const OG_SLOGAN = '一字之間，照見五地字形'
const OG_DESCRIPTION =
  '把同一個漢字並排、疊印，照見中國大陸、香港、臺灣、日本與韓國之間細微而真實的字形差異。'
const OG_SHORT_DESCRIPTION = '並排五地字形，疊印彼此間的細微差異。'

const FEATURE_LAYOUT = {
  specimen: { left: 58, top: 126, width: 442, height: 374, size: 338 },
  copy: { left: 576, top: 155, width: 580, height: 315 },
} as const
const ABOUT_CONTENT_OFFSET_Y = 32

const OG_COPY = [
  OG_SLOGAN,
  OG_DESCRIPTION,
  OG_SHORT_DESCRIPTION,
  '漢智關於漢智四地字形疊印',
  '中國大陸香港臺灣日本韓國',
  '·',
].join('')

const ASCII = Array.from({ length: 0x7e - 0x20 + 1 }, (_, index) =>
  String.fromCodePoint(0x20 + index),
).join('')

type Style = Record<string, string | number | undefined>

interface RegionalForm {
  char: string
  group: number
  path: string
  region: (typeof OG_REGIONS)[number]
}

export interface OgRenderer {
  renderAboutSvg: () => Promise<string>
  renderCharacterSvg: (row: CharRow) => Promise<string>
  renderHomeSvg: (variant?: HomeVariant) => Promise<string>
  renderPng: (svg: string) => Promise<Buffer>
}

export type HomeVariant = 'glyph-left' | 'text-left'

interface RendererContext {
  fonts: SatoriFont[]
  logoDataUrl: string
  regionalForms: (row: CharRow) => RegionalForm[]
}

interface BuildOptions {
  format?: 'png' | 'svg'
  homeVariant?: HomeVariant
  keys?: readonly string[]
  limit?: number
  outputDir?: string
}

interface CharacterProgress {
  bytes: number
  files: number
}

interface CharacterWorkerData {
  format: 'png' | 'svg'
  keys: string[]
  kind: 'hanji-og-character-worker'
  outputDir: string
}

type CharacterWorkerMessage =
  | { kind: 'done' }
  | { kind: 'error'; message: string }
  | { kind: 'progress'; progress: CharacterProgress }

/** Satori accepts React-shaped objects; its own JSX runtime supplies them. */
function element(
  type: string,
  props: Record<string, unknown> = {},
  ...children: JSXNode[]
): JSXNode {
  return createElement(type, props, ...children) as JSXNode
}

const box = (style: Style, ...children: JSXNode[]): JSXNode =>
  element(
    'div',
    {
      style: Object.fromEntries(
        Object.entries({ display: 'flex', ...style }).filter(
          (entry) => entry[1] !== undefined,
        ),
      ),
    },
    ...children,
  )

const cjk = (content: string, style: Style = {}): JSXNode =>
  box({ fontFamily: CJK_FAMILY, ...style }, content)

const latin = (content: string, style: Style = {}): JSXNode =>
  box({ fontFamily: LATIN_FAMILY, ...style }, content)

const mono = (content: string, style: Style = {}): JSXNode =>
  box({ fontFamily: MONO_FAMILY, ...style }, content)

function glyph(
  path: string,
  size: number,
  color: string,
  opacity = 1,
  style: Style = {},
  pathProps: Record<string, unknown> = {},
): JSXNode {
  return box(
    {
      display: 'flex',
      width: size,
      height: size,
      ...style,
    },
    element(
      'svg',
      { width: size, height: size, viewBox: GLYPH_VIEW_BOX },
      element('path', { d: path, fill: color, opacity, ...pathProps }),
    ),
  )
}

function overprint(row: CharRow, forms: RegionalForm[], size: number): JSXNode {
  const representatives = new Map<number, RegionalForm>()
  for (const form of forms)
    if (!representatives.has(form.group)) representatives.set(form.group, form)

  const layers = [...representatives.values()]
  const differs = layers.length > 1
  const fillOpacity = differs ? overprintOpacity(row, OG_REGIONS) : 1

  return box(
    {
      position: 'relative',
      display: 'flex',
      width: size,
      height: size,
      overflow: 'hidden',
    },
    ...layers.map((form) => {
      const color = differs
        ? OVERPRINT_PLATE_SRGB[overprintPlateIndex(form.group)]!
        : COLORS.ink
      return glyph(
        form.path,
        size,
        color,
        1,
        { position: 'absolute', left: 0, top: 0 },
        {
          fillOpacity,
          paintOrder: 'stroke fill',
          stroke: color,
          strokeOpacity: 0.76,
          strokeWidth: 2,
          style: { mixBlendMode: 'darken' },
        },
      )
    }),
  )
}

function proofBackground(): JSXNode[] {
  const gridColor = 'rgba(22,21,26,0.045)'
  return [
    box({
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      backgroundImage: `repeating-linear-gradient(to right, ${gridColor} 0px, ${gridColor} 1px, transparent 1px, transparent 64px)`,
    }),
    box({
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      backgroundImage: `repeating-linear-gradient(to bottom, ${gridColor} 0px, ${gridColor} 1px, transparent 1px, transparent 64px)`,
    }),
    box({
      position: 'absolute',
      left: 0,
      bottom: 0,
      width: '100%',
      height: 16,
      backgroundColor: COLORS.red,
    }),
  ]
}

function brandHeader(context: RendererContext): JSXNode {
  return box(
    {
      position: 'absolute',
      left: 48,
      top: 39,
      display: 'flex',
      width: OG_IMAGE_WIDTH - 96,
      height: 48,
      alignItems: 'center',
    },
    box(
      { display: 'flex', alignItems: 'center', gap: 14 },
      element('img', {
        src: context.logoDataUrl,
        width: 46,
        height: 46,
      }),
      box(
        { display: 'flex', alignItems: 'baseline', gap: 10 },
        cjk('漢智', { fontSize: 32, color: COLORS.ink, lineHeight: 1 }),
        latin('Hanji', {
          fontSize: 32,
          color: COLORS.ink,
          letterSpacing: '0.2px',
          lineHeight: 1,
        }),
      ),
    ),
  )
}

function footer(): JSXNode {
  return box(
    {
      position: 'absolute',
      right: 48,
      bottom: 37,
      display: 'flex',
      width: 560,
      height: 24,
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 18,
    },
    box({ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.red }),
    box({ width: 96, height: 1, backgroundColor: COLORS.rule }),
    cjk(OG_SLOGAN, {
      fontSize: 18,
      color: COLORS.soft,
      letterSpacing: '1px',
      lineHeight: 1,
    }),
  )
}

function sealDivider(): JSXNode {
  return box({
    width: 52,
    height: 3,
    marginTop: 24,
    marginBottom: 21,
    backgroundColor: COLORS.red,
  })
}

function sheet(background: JSXNode[], children: JSXNode[]): JSXNode {
  return box(
    {
      position: 'relative',
      display: 'flex',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      color: COLORS.ink,
      backgroundColor: COLORS.paper,
    },
    ...background,
    ...children,
  )
}

const root = (...children: JSXNode[]): JSXNode =>
  sheet(proofBackground(), children)

function registrationStage(
  row: CharRow,
  forms: RegionalForm[],
  left: number,
  top: number,
  width: number,
  height: number,
  glyphSize: number,
  showTopBorder = true,
): JSXNode {
  return box(
    {
      position: 'absolute',
      left,
      top,
      display: 'flex',
      width,
      height,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderTop: showTopBorder ? `1px solid ${COLORS.rule}` : undefined,
      borderBottom: `1px solid ${COLORS.rule}`,
    },
    ...(showTopBorder
      ? []
      : [
          box({
            position: 'absolute',
            left: 0,
            top: 0,
            width,
            height: 4,
            backgroundColor: COLORS.paper,
          }),
        ]),
    box({
      position: 'absolute',
      left: Math.round(width / 2),
      top: 0,
      width: 1,
      height,
      backgroundColor: COLORS.rule,
      opacity: 0.65,
    }),
    box({
      position: 'absolute',
      left: 0,
      top: Math.round(height / 2),
      width,
      height: 1,
      backgroundColor: COLORS.rule,
      opacity: 0.65,
    }),
    overprint(row, forms, glyphSize),
  )
}

function regionStrip(
  forms: RegionalForm[],
  left: number,
  top: number,
  width: number,
): JSXNode {
  const cellWidth = width / forms.length
  return box(
    {
      position: 'absolute',
      left,
      top,
      display: 'flex',
      width,
      height: 60,
      borderTop: `1px solid ${COLORS.rule}`,
    },
    ...forms.map((form, index) =>
      box(
        {
          position: 'relative',
          display: 'flex',
          width: cellWidth,
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          borderLeft: index ? `1px solid ${COLORS.rule}` : undefined,
        },
        box({
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: cellWidth,
          height: 4,
          backgroundColor: GROUP_COLORS[form.group] ?? COLORS.violet,
        }),
        latin(REGION_CODES[form.region], {
          fontSize: 14,
          color: COLORS.mute,
          letterSpacing: '1.5px',
          lineHeight: 1,
        }),
        cjk(REGION_LABELS[form.region], {
          fontSize: 16,
          color: COLORS.soft,
          lineHeight: 1,
        }),
      ),
    ),
  )
}

function regionGrid(
  forms: RegionalForm[],
  left: number,
  top: number,
  width: number,
  height: number,
): JSXNode {
  const cellWidth = width / 2
  const cellHeight = height / 2
  return box(
    {
      position: 'absolute',
      left,
      top,
      display: 'flex',
      width,
      height,
      flexDirection: 'column',
      border: `1px solid ${COLORS.rule}`,
    },
    ...[0, 1].map((row) =>
      box(
        {
          display: 'flex',
          width,
          height: cellHeight,
          borderTop: row ? `1px solid ${COLORS.rule}` : undefined,
        },
        ...forms.slice(row * 2, row * 2 + 2).map((form, column) =>
          box(
            {
              position: 'relative',
              display: 'flex',
              width: cellWidth,
              height: cellHeight,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              borderLeft: column ? `1px solid ${COLORS.rule}` : undefined,
            },
            box({
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: cellWidth,
              height: 4,
              backgroundColor: GROUP_COLORS[form.group] ?? COLORS.violet,
            }),
            latin(REGION_CODES[form.region], {
              fontSize: 14,
              color: COLORS.mute,
              letterSpacing: '1.5px',
              lineHeight: 1,
            }),
            glyph(form.path, 76, GROUP_COLORS[form.group] ?? COLORS.violet, 1, {
              transform: 'translateY(4px)',
            }),
          ),
        ),
      ),
    ),
  )
}

function homeTree(
  context: RendererContext,
  hero: CharRow,
  variant: HomeVariant,
): JSXNode {
  const forms = context.regionalForms(hero)
  const glyphLeft = variant === 'glyph-left'
  const copyLeft = glyphLeft ? FEATURE_LAYOUT.copy.left : 64
  const copyWidth = glyphLeft ? FEATURE_LAYOUT.copy.width : 610
  const specimenLeft = glyphLeft ? FEATURE_LAYOUT.specimen.left : 700
  return root(
    brandHeader(context),
    box({
      position: 'absolute',
      left: 28,
      top: 104,
      width: OG_IMAGE_WIDTH - 56,
      height: 1,
      backgroundColor: COLORS.rule,
    }),
    box(
      {
        position: 'absolute',
        left: copyLeft,
        top: FEATURE_LAYOUT.copy.top,
        display: 'flex',
        width: copyWidth,
        height: FEATURE_LAYOUT.copy.height,
        flexDirection: 'column',
        justifyContent: 'center',
      },
      cjk('一字之間，', {
        fontSize: 76,
        color: COLORS.ink,
        lineHeight: 1.15,
        letterSpacing: '-1px',
      }),
      cjk('照見五地字形', {
        marginTop: 2,
        fontSize: 76,
        color: COLORS.ink,
        lineHeight: 1.15,
        letterSpacing: '-1px',
      }),
      sealDivider(),
      cjk(OG_SHORT_DESCRIPTION, {
        fontSize: 32,
        color: COLORS.soft,
        lineHeight: 1.5,
      }),
    ),
    registrationStage(
      hero,
      forms,
      specimenLeft,
      FEATURE_LAYOUT.specimen.top,
      FEATURE_LAYOUT.specimen.width,
      FEATURE_LAYOUT.specimen.height,
      FEATURE_LAYOUT.specimen.size,
      false,
    ),
    regionStrip(
      forms,
      specimenLeft,
      FEATURE_LAYOUT.specimen.top + FEATURE_LAYOUT.specimen.height,
      FEATURE_LAYOUT.specimen.width,
    ),
  )
}

function aboutTree(context: RendererContext): JSXNode {
  const logoSize = FEATURE_LAYOUT.specimen.size
  const logoLeft =
    FEATURE_LAYOUT.specimen.left +
    (FEATURE_LAYOUT.specimen.width - logoSize) / 2
  const logoTop =
    FEATURE_LAYOUT.specimen.top +
    (FEATURE_LAYOUT.specimen.height - logoSize) / 2 +
    ABOUT_CONTENT_OFFSET_Y

  return root(
    brandHeader(context),
    box({
      position: 'absolute',
      left: 28,
      top: 104,
      width: OG_IMAGE_WIDTH - 56,
      height: 1,
      backgroundColor: COLORS.rule,
    }),
    element('img', {
      src: context.logoDataUrl,
      width: logoSize,
      height: logoSize,
      style: { position: 'absolute', left: logoLeft, top: logoTop },
    }),
    box(
      {
        position: 'absolute',
        left: FEATURE_LAYOUT.copy.left,
        top: FEATURE_LAYOUT.copy.top + ABOUT_CONTENT_OFFSET_Y,
        display: 'flex',
        width: FEATURE_LAYOUT.copy.width,
        height: FEATURE_LAYOUT.copy.height,
        flexDirection: 'column',
        justifyContent: 'center',
      },
      cjk('關於漢智', {
        fontSize: 76,
        color: COLORS.ink,
        lineHeight: 1.15,
        letterSpacing: '-1px',
      }),
      sealDivider(),
      cjk(OG_SHORT_DESCRIPTION, {
        fontSize: 32,
        color: COLORS.soft,
        lineHeight: 1.5,
      }),
    ),
    footer(),
  )
}

function characterTree(context: RendererContext, row: CharRow): JSXNode {
  const forms = context.regionalForms(row)
  const taiwan = forms.find((form) => form.region === 'tw')!
  const codePoint = `U+${row.key.codePointAt(0)!.toString(16).toUpperCase()}`
  return root(
    brandHeader(context),
    box({
      position: 'absolute',
      left: 28,
      top: 104,
      width: OG_IMAGE_WIDTH - 56,
      height: 1,
      backgroundColor: COLORS.rule,
    }),
    glyph(taiwan.path, 520, COLORS.red, 0.055, {
      position: 'absolute',
      left: 748,
      top: 79,
    }),
    registrationStage(row, forms, 60, 122, 560, 420, 405, false),
    regionGrid(forms, 682, 278, 440, 240),
    box(
      {
        position: 'absolute',
        left: 682,
        top: 151,
        display: 'flex',
        width: 440,
        height: 104,
        flexDirection: 'column',
      },
      mono(codePoint, {
        fontSize: 21,
        color: COLORS.red,
        letterSpacing: '1px',
        lineHeight: 1,
      }),
      cjk('四地字形疊印', {
        marginTop: 14,
        fontSize: 48,
        color: COLORS.ink,
        lineHeight: 1.15,
      }),
    ),
    footer(),
  )
}

const SVG_PROVENANCE =
  '<!-- Generated by scripts/build-og-images.ts with Satori; glyph outlines come from the pinned Noto CJK sources. -->'

function withSvgProvenance(svg: string): string {
  return `${SVG_PROVENANCE}\n${svg}`
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngTextChunk(keyword: string, value: string): Buffer {
  const type = Buffer.from('tEXt')
  const data = Buffer.from(`${keyword}\0${value}`, 'latin1')
  const chunk = Buffer.allocUnsafe(12 + data.length)
  chunk.writeUInt32BE(data.length, 0)
  type.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(Buffer.concat([type, data])), 8 + data.length)
  return chunk
}

function addPngProvenance(png: Buffer): Buffer {
  // PNG signature (8) + IHDR length/type/data/CRC (25).
  const afterHeader = 33
  const provenance = pngTextChunk(
    'Software',
    'Hanji build-time Satori/Resvg generator; scripts/build-og-images.ts',
  )
  return Buffer.concat([
    png.subarray(0, afterHeader),
    provenance,
    png.subarray(afterHeader),
  ])
}

async function loadRendererContext(): Promise<RendererContext> {
  const fontSourceNames = {
    cn: 'font/NotoSerifCJKsc-Regular.otf',
    hk: 'font/NotoSerifCJKhk-Regular.otf',
    tw: 'font/NotoSerifCJKtc-Regular.otf',
    jp: 'font/NotoSerifCJKjp-Regular.otf',
    rare: 'font/WenJinMinchoP2-Regular.otf',
  } as const

  const [entries, monoSource] = await Promise.all([
    Promise.all(
      Object.entries(fontSourceNames).map(
        async ([key, source]) => [key, await raw(source)] as const,
      ),
    ),
    raw('font/NotoSansMono-Regular.ttf'),
  ])
  const buffers = Object.fromEntries(entries) as Record<
    keyof typeof fontSourceNames,
    Buffer
  >
  const glyphFonts = Object.fromEntries(
    Object.entries(buffers).map(([key, data]) => [
      key,
      fontkit.create(data) as Font,
    ]),
  ) as Record<keyof typeof fontSourceNames, Font>

  const [cjkFont, latinFont, monoFont, logo] = await Promise.all([
    subsetFont(buffers.tw, OG_COPY, {
      targetFormat: 'woff',
      noLayoutClosure: true,
    }),
    // The dedicated Latin source is variable; Satori's OpenType reader cannot
    // consume the subset-font variable WOFF reliably. Noto CJK's regular face
    // carries a static Latin set with matching metrics, so use that here.
    subsetFont(buffers.tw, ASCII, {
      targetFormat: 'woff',
      noLayoutClosure: true,
    }),
    subsetFont(monoSource, ASCII, {
      targetFormat: 'woff',
      noLayoutClosure: true,
    }),
    readFile(join(ROOT, 'public/logo-seal.svg')),
  ])

  const pathCache = new Map<string, string>()
  const pathFor = (row: CharRow, region: Region): string => {
    const index = REGIONS.indexOf(region)
    const char = row.chars[index]!
    const source = usesSupplementalFont(row, region, 'serif')
      ? 'rare'
      : fontRegionOf(row, index)
    if (source === 'kr')
      throw new Error(`OG row ${row.key} unexpectedly selected the KR font`)
    const font = glyphFonts[source]
    const glyph = font.glyphForCodePoint(char.codePointAt(0)!)
    if (!glyph.id)
      throw new Error(`OG font ${source} does not contain ${char} (${row.key})`)
    const cacheKey = `${source}:${glyph.id}`
    const cached = pathCache.get(cacheKey)
    if (cached) return cached
    const scale = 1000 / font.unitsPerEm
    const path = glyph.path.scale(scale, -scale).toSVG()
    pathCache.set(cacheKey, path)
    return path
  }

  return {
    fonts: [
      {
        name: CJK_FAMILY,
        data: cjkFont,
        weight: 400,
        style: 'normal',
      },
      {
        name: LATIN_FAMILY,
        data: latinFont,
        weight: 400,
        style: 'normal',
      },
      {
        name: MONO_FAMILY,
        data: monoFont,
        weight: 400,
        style: 'normal',
      },
    ],
    logoDataUrl: `data:image/svg+xml;base64,${logo.toString('base64')}`,
    regionalForms(row) {
      const indices = OG_REGIONS.map((region) => REGIONS.indexOf(region))
      const signature = projectSignature(row.glyph, indices)
      return OG_REGIONS.map((region, position) => {
        const index = REGIONS.indexOf(region)
        return {
          char: row.chars[index]!,
          group: Number(signature[position]),
          path: pathFor(row, region),
          region,
        }
      })
    },
  }
}

export async function createOgRenderer(data?: CharsData): Promise<OgRenderer> {
  const chars =
    data ??
    (JSON.parse(
      await readFile(join(DATA_DIR, 'chars.json'), 'utf8'),
    ) as CharsData)
  const context = await loadRendererContext()
  const hero = chars.rows.find((row) => row.key === '返')
  if (!hero) throw new Error('The OG specimen row 返 is missing from the data.')

  const render = async (tree: JSXNode): Promise<string> =>
    withSvgProvenance(
      await satori(tree as never, {
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        fonts: context.fonts,
      }),
    )

  return {
    renderHomeSvg: (variant = 'glyph-left') =>
      render(homeTree(context, hero, variant)),
    renderAboutSvg: () => render(aboutTree(context)),
    renderCharacterSvg: (row) => render(characterTree(context, row)),
    async renderPng(svg) {
      const image = new Resvg(svg, {
        background: COLORS.paper,
        fitTo: { mode: 'width', value: OG_IMAGE_WIDTH },
        font: { loadSystemFonts: false },
      })
      const optimized = await sharp(image.render().asPng())
        .png({
          palette: true,
          colours: 256,
          dither: 0,
          effort: 4,
          quality: 100,
        })
        .toBuffer()
      return addPngProvenance(optimized)
    },
  }
}

function extensionOf(format: 'png' | 'svg'): string {
  return format === 'png' ? '.png' : '.svg'
}

async function writeRendered(
  path: string,
  svg: string,
  format: 'png' | 'svg',
  renderer: OgRenderer,
): Promise<number> {
  const output =
    format === 'png' ? await renderer.renderPng(svg) : Buffer.from(svg)
  await writeFile(path, output)
  return output.byteLength
}

async function renderCharacterRows(
  rows: readonly CharRow[],
  renderer: OgRenderer,
  format: 'png' | 'svg',
  outputDir: string,
  onProgress: (progress: CharacterProgress) => void,
): Promise<void> {
  const extension = extensionOf(format)
  let batchFiles = 0
  let batchBytes = 0
  for (const [index, row] of rows.entries()) {
    batchBytes += await writeRendered(
      join(outputDir, `${row.key}${extension}`),
      await renderer.renderCharacterSvg(row),
      format,
      renderer,
    )
    batchFiles++
    if (batchFiles === 25 || index + 1 === rows.length) {
      onProgress({ bytes: batchBytes, files: batchFiles })
      batchFiles = 0
      batchBytes = 0
    }
  }
}

function rowsForKeys(data: CharsData, keys: readonly string[]): CharRow[] {
  const rows = new Map(data.rows.map((row) => [row.key, row]))
  return keys.map((key) => {
    const row = rows.get(key)
    if (!row) throw new Error(`Unknown OG character key: ${key}`)
    return row
  })
}

function isCharacterWorkerData(value: unknown): value is CharacterWorkerData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'hanji-og-character-worker'
  )
}

async function runCharacterWorker(task: CharacterWorkerData): Promise<void> {
  const port = parentPort
  if (!port) throw new Error('OG worker has no parent port')
  const data = JSON.parse(
    await readFile(join(DATA_DIR, 'chars.json'), 'utf8'),
  ) as CharsData
  const renderer = await createOgRenderer(data)
  await renderCharacterRows(
    rowsForKeys(data, task.keys),
    renderer,
    task.format,
    task.outputDir,
    (progress) =>
      port.postMessage({
        kind: 'progress',
        progress,
      } satisfies CharacterWorkerMessage),
  )
}

async function runCharacterWorkers(
  tasks: CharacterWorkerData[],
  onProgress: (progress: CharacterProgress) => void,
): Promise<void> {
  const workers: Worker[] = []
  const runs = tasks.map(
    (task) =>
      new Promise<void>((resolvePromise, rejectPromise) => {
        const worker = new Worker(new URL(import.meta.url), {
          workerData: task,
        })
        workers.push(worker)
        let settled = false
        worker.on('message', (message: CharacterWorkerMessage) => {
          switch (message.kind) {
            case 'progress': {
              onProgress(message.progress)
              break
            }
            case 'done': {
              settled = true
              resolvePromise()
              break
            }
            case 'error': {
              settled = true
              rejectPromise(new Error(message.message))
              break
            }
          }
        })
        worker.once('error', (error) => {
          settled = true
          rejectPromise(error)
        })
        worker.once('exit', (code) => {
          if (!settled)
            rejectPromise(
              new Error(`OG character worker exited with code ${code}`),
            )
        })
      }),
  )

  try {
    await Promise.all(runs)
  } catch (error) {
    await Promise.allSettled(workers.map((worker) => worker.terminate()))
    throw error
  }
}

export async function buildOgImages(
  options: BuildOptions = {},
): Promise<{ files: number; bytes: number }> {
  const {
    format = 'png',
    homeVariant = 'glyph-left',
    keys,
    limit,
    outputDir = join(ROOT, '.output/public/og'),
  } = options
  const data = JSON.parse(
    await readFile(join(DATA_DIR, 'chars.json'), 'utf8'),
  ) as CharsData
  const wanted = keys?.length ? new Set(keys) : undefined
  const selected = data.rows
    .filter((row) => !wanted || wanted.has(row.key))
    .slice(0, limit)
  if (wanted) {
    const found = new Set(selected.map((row) => row.key))
    const missing = [...wanted].filter((key) => !found.has(key))
    if (missing.length) throw new Error(`Unknown OG character keys: ${missing}`)
  }

  const renderer = await createOgRenderer(data)
  const charDir = join(outputDir, 'char')
  await mkdir(charDir, { recursive: true })
  const extension = extensionOf(format)
  let files = 0
  let bytes = 0

  bytes += await writeRendered(
    join(outputDir, `home${extension}`),
    await renderer.renderHomeSvg(homeVariant),
    format,
    renderer,
  )
  files++
  bytes += await writeRendered(
    join(outputDir, `about${extension}`),
    await renderer.renderAboutSvg(),
    format,
    renderer,
  )
  files++

  let completedCharacters = 0
  let nextReport = Math.min(250, selected.length)
  const onProgress = (progress: CharacterProgress) => {
    completedCharacters += progress.files
    files += progress.files
    bytes += progress.bytes
    if (
      completedCharacters >= nextReport ||
      completedCharacters === selected.length
    ) {
      process.stderr.write(
        `OG images ${completedCharacters}/${selected.length}\r${
          completedCharacters === selected.length ? '\n' : ''
        }`,
      )
      while (nextReport <= completedCharacters) nextReport += 250
    }
  }

  const workerCount = Math.min(availableParallelism(), selected.length)
  if (workerCount === 1) {
    await renderCharacterRows(selected, renderer, format, charDir, onProgress)
  } else if (workerCount > 1) {
    const chunks = Array.from({ length: workerCount }, () => [] as string[])
    selected.forEach((row, index) => chunks[index % workerCount]!.push(row.key))
    await runCharacterWorkers(
      chunks.map((workerKeys) => ({
        format,
        keys: workerKeys,
        kind: 'hanji-og-character-worker',
        outputDir: charDir,
      })),
      onProgress,
    )
  }

  return { files, bytes }
}

function cliOptions(args: string[]): BuildOptions {
  const options: BuildOptions = {}
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    switch (argument) {
      case '--format': {
        const format = args[++index]
        if (format !== 'png' && format !== 'svg')
          throw new Error('--format must be png or svg')
        options.format = format
        break
      }
      case '--keys': {
        options.keys = (args[++index] ?? '').split(',').filter(Boolean)
        break
      }
      case '--home-variant': {
        const variant = args[++index]
        if (variant !== 'glyph-left' && variant !== 'text-left')
          throw new Error('--home-variant must be glyph-left or text-left')
        options.homeVariant = variant
        break
      }
      case '--limit': {
        const limit = Number(args[++index])
        if (!Number.isInteger(limit) || limit < 0)
          throw new Error('--limit must be a non-negative integer')
        options.limit = limit
        break
      }
      case '--output': {
        options.outputDir = resolve(args[++index] ?? '')
        break
      }
      default: {
        throw new Error(`Unknown argument: ${argument}`)
      }
    }
  }
  return options
}

const entry = process.argv[1] ? resolve(process.argv[1]) : undefined
if (!isMainThread && isCharacterWorkerData(workerData)) {
  try {
    await runCharacterWorker(workerData)
    parentPort?.postMessage({ kind: 'done' } satisfies CharacterWorkerMessage)
  } catch (error) {
    parentPort?.postMessage({
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    } satisfies CharacterWorkerMessage)
    process.exitCode = 1
  }
}

if (isMainThread && entry === resolve(fileURLToPath(import.meta.url))) {
  try {
    const result = await buildOgImages(cliOptions(process.argv.slice(2)))
    process.stderr.write(
      `${result.files} OG images, ${(result.bytes / 1024 / 1024).toFixed(2)} MB\n`,
    )
  } catch (error) {
    process.stderr.write(
      `OG generation failed: ${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  }
}
