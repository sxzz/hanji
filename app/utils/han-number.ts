/**
 * A small count as a Han numeral.
 *
 * Chinese and Japanese use Han numerals here. Korean needs the attributive
 * native forms that precede its counters: 한 가지, 두 가지, and so on.
 */
const hanNumberFormat = new Intl.NumberFormat('zh', {
  numberingSystem: 'hanidec',
  useGrouping: false,
})
const KOREAN_COUNTERS = ['영', '한', '두', '세', '네', '다섯']

export const hanNumber = (value: number, locale = 'zh-CN'): string =>
  locale.startsWith('en')
    ? String(value)
    : locale.startsWith('ko')
      ? (KOREAN_COUNTERS[value] ?? String(value))
      : hanNumberFormat.format(value)
