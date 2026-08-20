/**
 * A small count as a Han numeral.
 *
 * Every interface language here is written in Han script and spells these the
 * same way, so the numeral is a formatting detail rather than a message of its
 * own: 三地同形 reads in Chinese exactly as 三つの字形 reads in Japanese.
 */
const hanNumberFormat = new Intl.NumberFormat('zh', {
  numberingSystem: 'hanidec',
  useGrouping: false,
})

export const hanNumber = (value: number): string =>
  hanNumberFormat.format(value)
