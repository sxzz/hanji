import type { Locale } from '../locales/index.ts'

export function formatList(
  items: readonly string[],
  locale: Locale,
  style: Intl.ListFormatStyle = 'long',
): string {
  return new Intl.ListFormat(locale, {
    style,
    type: 'conjunction',
  }).format(items)
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value)
}
