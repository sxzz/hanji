/**
 * Adobe CMap parser.
 *
 * Source Han Sans shares one glyph pool across its five regions, each with its
 * own codepoint -> CID mapping. Within that pool an equal CID means an
 * identical glyph, so diffing the five CMaps decides exactly whether the five
 * regions write a character differently -- no outline comparison, no font
 * parsing.
 *
 * File format:
 *   N begincidrange
 *   <lo> <hi> firstCid      // lo..hi map to firstCid, firstCid + 1, ...
 *   endcidrange
 *   N begincidchar
 *   <cp> cid
 *   endcidchar
 */
const RANGE_BLOCK = /begincidrange([\s\S]*?)endcidrange/g
const RANGE_ENTRY = /<([\da-f]+)>\s*<([\da-f]+)>\s*(\d+)/gi
const CHAR_BLOCK = /begincidchar([\s\S]*?)endcidchar/g
const CHAR_ENTRY = /<([\da-f]+)>\s*(\d+)/gi

export function parseCMap(text: string): Map<number, number> {
  const map = new Map<number, number>()

  for (const [, body] of text.matchAll(RANGE_BLOCK)) {
    for (const [, loText, hiText, cidText] of body.matchAll(RANGE_ENTRY)) {
      const lo = Number.parseInt(loText, 16)
      const hi = Number.parseInt(hiText, 16)
      const cid = Number(cidText)
      for (let cp = lo; cp <= hi; cp++) map.set(cp, cid + (cp - lo))
    }
  }

  for (const [, body] of text.matchAll(CHAR_BLOCK)) {
    for (const [, cpText, cidText] of body.matchAll(CHAR_ENTRY)) {
      map.set(Number.parseInt(cpText, 16), Number(cidText))
    }
  }

  return map
}

/**
 * Normalize a tuple into a partition signature by numbering values in order of
 * first appearance.
 *
 *   [a, b, b, c] -> "0112"    three ways of writing it; HK and TW agree
 *   [a, a, a, a, a] -> "00000"    all five regions agree
 *   [a, b, c, d, e] -> "01234"    all five differ
 *
 * A 5-element set has Bell(5) = 52 partitions. The filter derives the
 * complete, mutually exclusive set actually present in the generated data.
 */
export function partitionSignature(values: readonly unknown[]): string {
  const seen = new Map<unknown, number>()
  let signature = ''
  for (const value of values) {
    let index = seen.get(value)
    if (index === undefined) seen.set(value, (index = seen.size))
    signature += index
  }
  return signature
}
