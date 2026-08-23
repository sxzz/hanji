import { describe, expect, it } from 'vitest'
import { dictionaryRegionsFor, matchLocale } from '../../app/locales/index.ts'
import { jaJP } from '../../app/locales/ja-jp.ts'
import { koKR } from '../../app/locales/ko-kr.ts'
import { zhCN } from '../../app/locales/zh-cn.ts'
import { zhHK } from '../../app/locales/zh-hk.ts'
import { zhTW } from '../../app/locales/zh-tw.ts'
import { hanNumber } from '../../app/utils/han-number.ts'
import { SOURCES } from '../../shared/sources.ts'

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
