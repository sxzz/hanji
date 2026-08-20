import { describe, expect, it } from 'vitest'
import {
  kanjiVGDataUrl,
  kanjiVGFilename,
  kanjiVGViewerUrl,
  parseKanjiVG,
  strokeDuration,
} from '../../app/utils/kanjivg.ts'

describe('KanjiVG data', () => {
  it('uses KanjiVG code-point filenames', () => {
    expect(kanjiVGFilename('説')).toBe('08aac.svg')
    expect(kanjiVGFilename('𠮷')).toBe('20bb7.svg')
    expect(kanjiVGDataUrl('説')).toBe(
      'https://kanjivg.tagaini.net/kanjivg/kanji/08aac.svg',
    )
    expect(kanjiVGViewerUrl('説')).toBe(
      'https://kanjivg.tagaini.net/viewer.html?kanji=%E8%AA%AC',
    )
  })

  it('extracts and orders only numbered stroke paths', () => {
    const data = parseKanjiVG(`
      <svg viewBox="0 0 120 120">
        <path id="guide" d="M0 0L1 1" />
        <path d="M2 2L3 3" id="kvg:test-s2" />
        <path id="kvg:test-s1" kvg:type="dot" d="M0 0L2 2" />
      </svg>
    `)
    expect(data).toEqual({
      viewBox: '0 0 120 120',
      strokes: [
        { order: 1, d: 'M0 0L2 2' },
        { order: 2, d: 'M2 2L3 3' },
      ],
    })
  })

  it('rejects an SVG without stroke data', () => {
    expect(() => parseKanjiVG('<svg />')).toThrow('no strokes')
  })

  it('keeps animation timing within its readable range', () => {
    expect(strokeDuration(1)).toBe(360)
    expect(strokeDuration(60)).toBe(540)
    expect(strokeDuration(1_000)).toBe(780)
  })
})
