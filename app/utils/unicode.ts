/** Whether a number can be represented as a Unicode scalar value. */
export const isUnicodeScalarValue = (codePoint: number): boolean =>
  Number.isInteger(codePoint) &&
  codePoint >= 0 &&
  codePoint <= 0x10ffff &&
  (codePoint < 0xd800 || codePoint > 0xdfff)
