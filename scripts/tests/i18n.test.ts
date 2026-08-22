import { describe, expect, it } from 'vitest'
import {
  dictionaryRegionsFor,
  LOCALE_DICTIONARY_REGION,
  LOCALE_FREQUENCY_REGION,
  matchLocale,
} from '../../app/locales/index.ts'
import { jaJP } from '../../app/locales/ja-jp.ts'
import { koKR } from '../../app/locales/ko-kr.ts'
import { zhCN } from '../../app/locales/zh-cn.ts'
import { hanNumber } from '../../app/utils/han-number.ts'

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

  it.each(['ko', 'ko-KR', 'ko-Kore-KR'])('matches %s to Korean', (tag) => {
    expect(matchLocale([tag])).toBe('ko-KR')
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

describe('locale-aware frequency defaults', () => {
  it('uses the matching corpus and keeps Korea on the documented fallback', () => {
    expect(LOCALE_FREQUENCY_REGION).toEqual({
      'zh-CN': 'cn',
      'zh-TW': 'tw',
      'zh-HK': 'hk',
      'ja-JP': 'jp',
      'ko-KR': 'cn',
    })
  })
})

describe('locale-aware dictionaries', () => {
  it('maps every interface locale to its own regional dictionaries', () => {
    expect(LOCALE_DICTIONARY_REGION).toEqual({
      'zh-CN': 'cn',
      'zh-TW': 'tw',
      'zh-HK': 'hk',
      'ja-JP': 'jp',
      'ko-KR': 'kr',
    })
  })

  it('combines the locale region with the regions being compared', () => {
    expect(dictionaryRegionsFor('ko-KR', ['cn', 'jp'])).toEqual([
      'cn',
      'jp',
      'kr',
    ])
    expect(dictionaryRegionsFor('zh-HK', ['cn', 'jp'])).toEqual([
      'cn',
      'hk',
      'jp',
    ])
  })
})

describe('locale-aware small numbers', () => {
  it('uses Korean counter forms in Korean copy', () => {
    expect(hanNumber(1, 'ko-KR')).toBe('한')
    expect(hanNumber(4, 'ko-KR')).toBe('네')
    expect(koKR.filter.identical.replace('{n}', hanNumber(4, 'ko-KR'))).toBe(
      '네 개 지역에서 같은 자형',
    )
    expect(koKR.filter.variety.replace('{n}', hanNumber(3, 'ko-KR'))).toBe(
      '세 가지 자형',
    )
  })

  it('keeps Han numerals for the existing locales', () => {
    expect(hanNumber(3, 'ja-JP')).toBe('三')
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

describe('Korean messages', () => {
  it('has every message and interpolation parameter in the default locale', () => {
    const base = leaves(zhCN)
    const translated = leaves(koKR)

    expect(Object.keys(translated).toSorted()).toEqual(
      Object.keys(base).toSorted(),
    )
    for (const [key, message] of Object.entries(base))
      expect(params(translated[key]!), key).toEqual(params(message))
  })
})
