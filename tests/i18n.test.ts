import { describe, expect, it } from 'vitest'
import { enUS } from '../app/locales/en-us.ts'
import {
  dictionaryRegionsFor,
  LOCALE_DICTIONARY_REGION,
  LOCALE_FREQUENCY_REGION,
  LOCALE_META,
  matchLocale,
} from '../app/locales/index.ts'
import { jaJP } from '../app/locales/ja-jp.ts'
import { koKR } from '../app/locales/ko-kr.ts'
import { zhCN } from '../app/locales/zh-cn.ts'
import { zhHK } from '../app/locales/zh-hk.ts'
import { zhTW } from '../app/locales/zh-tw.ts'
import { hanNumber } from '../app/utils/han-number.ts'
import { formatList, formatNumber } from '../app/utils/locale-format.ts'
import { SOURCES } from '../shared/sources.ts'

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

const chineseMessages = [
  ['zh-CN', zhCN],
  ['zh-TW', zhTW],
  ['zh-HK', zhHK],
] as const

const manualHanLatinSpace =
  /\p{Script=Han}[ \u{A0}]+(?=[\p{Script=Latin}\p{Number}])|[\p{Script=Latin}\p{Number}][ \u{A0}]+(?=\p{Script=Han})/u

describe('Chinese typography', () => {
  it('leaves Han–Latin spacing to text-autospace', () => {
    const copy: Array<[string, string]> = chineseMessages.flatMap(
      ([locale, messages]) =>
        Object.entries(leaves(messages)).map(
          ([key, value]) => [`${locale}.${key}`, value] as [string, string],
        ),
    )

    for (const source of SOURCES) {
      for (const [locale] of chineseMessages) {
        copy.push(
          [`sources.${source.id}.${locale}.use`, source.use[locale]],
          [
            `sources.${source.id}.${locale}.name`,
            source.localizedName?.[locale] ?? source.name,
          ],
          [
            `sources.${source.id}.${locale}.license`,
            source.localizedLicense?.[locale] ?? source.license,
          ],
        )
        if (source.note)
          copy.push([
            `sources.${source.id}.${locale}.note`,
            source.note[locale],
          ])
      }
    }

    expect(
      copy.filter(([, message]) => manualHanLatinSpace.test(message)),
    ).toEqual([])
  })
})

describe('browser locale matching', () => {
  it.each(['en', 'en-US', 'en-GB', 'en-Latn-GB'])(
    'matches %s to US English',
    (tag) => {
      expect(matchLocale([tag])).toBe('en-US')
    },
  )

  it.each(['ja', 'ja-JP', 'ja-Jpan-JP'])('matches %s to Japanese', (tag) => {
    expect(matchLocale([tag])).toBe('ja-JP')
  })

  it.each(['ko', 'ko-KR', 'ko-Kore-KR'])('matches %s to Korean', (tag) => {
    expect(matchLocale([tag])).toBe('ko-KR')
  })

  it('uses the first supported language in browser preference order', () => {
    expect(matchLocale(['fr-FR', 'en-GB', 'ja-JP', 'zh-TW'])).toBe('en-US')
    expect(matchLocale(['fr-FR', 'ja-JP', 'en-US'])).toBe('ja-JP')
  })

  it('keeps the existing Chinese region matching', () => {
    expect(matchLocale(['zh-Hans'])).toBe('zh-CN')
    expect(matchLocale(['zh-Hant'])).toBe('zh-TW')
    expect(matchLocale(['zh-MO'])).toBe('zh-HK')
  })
})

describe('locale-aware dictionaries', () => {
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

  it('uses Mainland Chinese regional defaults for English', () => {
    expect(LOCALE_DICTIONARY_REGION['en-US']).toBe('cn')
    expect(LOCALE_FREQUENCY_REGION['en-US']).toBe('cn')
    expect(dictionaryRegionsFor('en-US', ['jp'])).toEqual(['cn', 'jp'])
    expect(LOCALE_META['en-US']).toMatchObject({
      htmlLang: 'en-US',
      uiFamily: 'UI zh-CN',
    })
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

  it('uses Arabic numerals in English copy', () => {
    expect(hanNumber(1, 'en-US')).toBe('1')
    expect(hanNumber(5, 'en-US')).toBe('5')
    expect(formatNumber(8449, 'en-US')).toBe('8,449')
  })
})

describe('locale-aware lists', () => {
  it('uses natural US English conjunctions', () => {
    expect(formatList(['Mainland China', 'Hong Kong', 'Taiwan'], 'en-US')).toBe(
      'Mainland China, Hong Kong, and Taiwan',
    )
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

describe('English messages', () => {
  it('has every message and interpolation parameter in the default locale', () => {
    const base = leaves(zhCN)
    const translated = leaves(enUS)

    expect(Object.keys(translated).toSorted()).toEqual(
      Object.keys(base).toSorted(),
    )
    for (const [key, message] of Object.entries(base))
      expect(params(translated[key]!), key).toEqual(params(message))
  })

  it('localizes every data-source field used by the interface', () => {
    for (const source of SOURCES) {
      expect(source.use['en-US'], `${source.id}.use`).toBeTruthy()
      expect(
        source.localizedName?.['en-US'] ?? source.name,
        `${source.id}.name`,
      ).toBeTruthy()
      expect(
        source.localizedLicense?.['en-US'] ?? source.license,
        `${source.id}.license`,
      ).toBeTruthy()
      if (source.note)
        expect(source.note['en-US'], `${source.id}.note`).toBeTruthy()
    }
  })
})
