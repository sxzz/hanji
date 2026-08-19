import { describe, expect, it } from 'vitest'
import { matchLocale } from '../../app/locales/index.ts'
import { jaJP } from '../../app/locales/ja-jp.ts'
import { zhCN } from '../../app/locales/zh-cn.ts'

function leaves(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      Object.entries(leaves(child, prefix ? `${prefix}.${key}` : key)),
    ),
  )
}

const params = (message: string): string[] =>
  [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).toSorted()

describe('browser locale matching', () => {
  it.each(['ja', 'ja-JP', 'ja-Jpan-JP'])('matches %s to Japanese', (tag) => {
    expect(matchLocale([tag])).toBe('ja-JP')
  })

  it('uses the first supported language in browser preference order', () => {
    expect(matchLocale(['en-US', 'ja-JP', 'zh-TW'])).toBe('ja-JP')
  })

  it('keeps the existing Chinese region matching', () => {
    expect(matchLocale(['zh-Hans'])).toBe('zh-CN')
    expect(matchLocale(['zh-Hant'])).toBe('zh-TW')
    expect(matchLocale(['zh-MO'])).toBe('zh-HK')
  })
})

describe('Japanese messages', () => {
  it('has every message and interpolation parameter in the default locale', () => {
    const base = leaves(zhCN)
    const translated = leaves(jaJP)

    expect(Object.keys(translated).toSorted()).toEqual(
      Object.keys(base).toSorted(),
    )
    for (const [key, message] of Object.entries(base))
      expect(params(translated[key]!), key).toEqual(params(message))
  })
})
