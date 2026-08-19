/**
 * Adobe CMap parser.
 *
 * Source Han Sans shares one glyph pool across its five regions, each with its
 * own codepoint -> CID mapping. Within that pool an equal CID means an
 * identical glyph, so diffing the four CMaps decides exactly whether the four
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
 *   [a, a, a, a] -> "0000"    all four regions agree
 *   [a, b, c, d] -> "0123"    all four differ
 *
 * A 4-element set has Bell(4) = 15 partitions; dropping the all-equal one
 * leaves 14 -- the filter's complete, mutually exclusive enumeration.
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
