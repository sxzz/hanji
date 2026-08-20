export const KANJIVG_HOME = 'https://kanjivg.tagaini.net/'
export const KANJIVG_LICENSE = 'https://creativecommons.org/licenses/by-sa/3.0/'

const DATA_ROOT = `${KANJIVG_HOME}kanjivg/kanji/`

export interface KanjiVGStroke {
  d: string
  order: number
}

export interface KanjiVGData {
  strokes: KanjiVGStroke[]
  viewBox: string
}

/** KanjiVG names BMP files with a leading zero: 説 (U+8AAC) -> 08aac.svg. */
export function kanjiVGFilename(char: string): string {
  const codePoint = Array.from(char)[0]?.codePointAt(0)
  if (codePoint === undefined) throw new Error('KanjiVG character is empty')
  return `${codePoint.toString(16).padStart(5, '0')}.svg`
}

export const kanjiVGDataUrl = (char: string): string =>
  `${DATA_ROOT}${kanjiVGFilename(char)}`

export const kanjiVGViewerUrl = (char: string): string =>
  `${KANJIVG_HOME}viewer.html?kanji=${encodeURIComponent(Array.from(char)[0]!)}`

const attribute = (tag: string, name: string): string | undefined => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`\\s${escaped}=(['"])(.*?)\\1`, 's').exec(tag)
  return match?.[2]
}

/**
 * Keep the third-party XML out of the DOM. KanjiVG path tags use ordinary
 * quoted attributes, so extracting only their numeric path data gives the
 * renderer the useful part without importing styles, links or markup.
 */
export function parseKanjiVG(source: string): KanjiVGData {
  const svg = /<svg\b[^>]*>/s.exec(source)?.[0]
  const rawViewBox = svg ? attribute(svg, 'viewBox') : undefined
  const viewBoxValues = rawViewBox
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)
  const viewBox =
    viewBoxValues?.length === 4 && viewBoxValues.every(Number.isFinite)
      ? viewBoxValues.join(' ')
      : '0 0 109 109'

  const strokes = [...source.matchAll(/<path\b[^>]*>/gs)]
    .map(([tag]) => {
      const id = attribute(tag, 'id')
      const d = attribute(tag, 'd')
      const order = id ? Number(/-s(\d+)$/.exec(id)?.[1]) : Number.NaN
      return { d, order }
    })
    .filter(
      (stroke): stroke is KanjiVGStroke =>
        Boolean(stroke.d) && Number.isInteger(stroke.order) && stroke.order > 0,
    )
    .toSorted((a, b) => a.order - b.order)

  if (strokes.length === 0) throw new Error('KanjiVG file has no strokes')
  return { strokes, viewBox }
}

/** Long sweeps should take visibly longer than a dot, within a calm range. */
export const strokeDuration = (length: number): number =>
  Math.round(Math.max(360, Math.min(780, length * 9)))
