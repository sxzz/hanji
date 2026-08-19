/**
 * A small count as a Han numeral.
 *
 * Every interface language here is written in Han script and spells these the
 * same way, so the numeral is a formatting detail rather than a message of its
 * own: 三地同形 reads in Chinese exactly as 三つの字形 reads in Japanese.
 * Anything past the handful of columns a row can have falls back to figures.
 */
const HAN_DIGITS = ['〇', '一', '二', '三', '四', '五']

export const hanNumber = (value: number): string =>
  HAN_DIGITS[value] ?? String(value)
