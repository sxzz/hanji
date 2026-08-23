/**
 * Validates the generated chars.json.
 *
 * These are golden samples measured from the Adobe CMaps while planning, so a
 * change upstream shows up here instead of silently reaching the page.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dictGroups, dictLinks, formsOf } from '../../shared/links.ts'
import { strokeDataRef } from '../../shared/strokes.ts'
import { REGIONS, type CharRow, type CharsData } from '../../shared/types.ts'
import {
  DATA_DIR,
  parseCharList,
  parseDict,
  parsePrimaryCharList,
  RAW_DIR,
} from '../sources.ts'

const data: CharsData = JSON.parse(
  readFileSync(join(DATA_DIR, 'chars.json'), 'utf8'),
)
const rows = new Map(data.rows.map((row) => [row.key, row]))
const row = (key: string): CharRow => {
  const found = rows.get(key)
  if (!found) throw new Error(`${key} is not listed`)
  return found
}

const LIST_NAMES = [
  'cn-1',
  'cn-2',
  'cn-3',
  'hk-common',
  'tw-common',
  'tw-sub',
  'jp-joyo',
  'jp-grade',
  'kr-basic',
] as const
type ListName = (typeof LIST_NAMES)[number]
const listText = (name: ListName) =>
  readFileSync(join(RAW_DIR, 'charlist', `${name}.txt`), 'utf8')
const covered = Object.fromEntries(
  LIST_NAMES.map((name) => [name, new Set(parseCharList(listText(name)))]),
) as Record<ListName, Set<string>>
const entered = Object.fromEntries(
  LIST_NAMES.map((name) => [
    name,
    new Set(parsePrimaryCharList(listText(name))),
  ]),
) as Record<ListName, Set<string>>
const jpShinjitai = parseDict(
  readFileSync(join(RAW_DIR, 'opencc', 'JPShinjitaiCharacters.txt'), 'utf8'),
)

it('does not emit redundant source metadata JSON', () => {
  expect(existsSync(join(DATA_DIR, 'sources.json'))).toBe(false)
})

describe('glyph partitions, columns in CN HK TW JP KR order', () => {
  it.each([
    ['骨', '01211', 'CN | HK+JP+KR | TW'],
    ['返', '01234', 'all five differ'],
    ['青', '00102', 'TW and KR each differ'],
    ['海', '00012', 'JP and KR each differ'],
    ['直', '01022', 'CN+TW | HK | JP+KR'],
    ['次', '00123', 'CN+HK | TW | JP | KR'],
    ['天', '00011', 'JP+KR, and the serif faces agree'],
  ])('%s is %s (%s)', (key, signature) => {
    expect(row(key).glyph).toBe(signature)
  })

  it.each(['一', '的', '了', '人', '子', '水', '金'])(
    'counts %s as written the same way everywhere',
    (key) => {
      expect(row(key).glyph).toBe('00000')
    },
  )

  it('lists characters written identically everywhere too', () => {
    // This is a dictionary of the five regions' common characters, not only
    // of the differences between them
    expect(data.stats.identical).toBeGreaterThan(1000)
    expect(data.rows.some((r) => r.glyph === '00000')).toBe(true)
  })
})

describe('character grouping', () => {
  it('keys 国 under its orthodox form and fills each column', () => {
    expect(row('國')).toMatchObject({
      chars: ['国', '國', '國', '国', '國'],
      old: { char: '國', glyph: 1, strokes: 11 },
      cp: '01101',
    })
  })

  it('splits 发 into the two orthodox characters it stands for', () => {
    expect(row('發').chars).toEqual(['发', '發', '發', '発', '發'])
    expect(row('髮').chars).toEqual(['发', '髮', '髮', '髪', '髮'])
  })

  it('puts the shinjitai in the jp column and the kyujitai in old', () => {
    expect(row('澤')).toMatchObject({
      chars: ['泽', '澤', '澤', '沢', '澤'],
      old: { char: '澤', glyph: 3, strokes: 16 },
    })
  })

  it('has no old form when all five share a codepoint', () => {
    expect(row('骨').old).toBeUndefined()
  })

  it('counts bracketed variants in the HK list, as in 台〔臺〕', () => {
    expect(row('臺').tier[1]).toBe(1)
  })
})

describe('readings', () => {
  it.each([
    ['一', ['일']],
    ['國', ['국']],
    ['女', ['녀', '여']],
    ['樂', ['낙', '락', '악', '요']],
    ['行', ['항', '행']],
    ['金', ['금', '김']],
  ])('gives %s its modern Korean reading(s)', (key, readings) => {
    expect(row(key).readings?.korean).toEqual(readings)
  })

  it('covers every character in the Korean education list', () => {
    const korean = data.rows.filter((entry) => entry.tier[4] > 0)
    expect(korean).toHaveLength(1800)
    expect(
      korean.every((entry) => (entry.readings?.korean?.length ?? 0) > 0),
    ).toBe(true)
  })

  it('stores normalized Hangul without Unihan source tags', () => {
    const readings = data.rows.flatMap((entry) => entry.readings?.korean ?? [])
    expect(readings.length).toBeGreaterThan(6000)
    for (const reading of readings) {
      expect(reading).toBe(reading.normalize('NFC'))
      expect(reading).toMatch(/^\p{Script=Hangul}+$/u)
    }
  })
})

describe('scale', () => {
  it('matches the measured whole-CMap difference ratio', () => {
    expect(data.stats.cmapDiffer / data.stats.cmapTotal).toBeCloseTo(0.388, 2)
    expect(data.stats.cmapDiffer).toBeGreaterThan(11_000)
    expect(data.stats.cmapDiffer).toBeLessThan(12_500)
  })

  it('lists a plausible number of rows', () => {
    expect(data.rows.length).toBeGreaterThan(5000)
    expect(data.rows.length).toBeLessThan(20_000)
  })

  it('has many canonical five-region partitions, including full disagreement', () => {
    expect(Object.keys(data.stats.byGlyph).length).toBeGreaterThan(40)
    expect(Object.keys(data.stats.byGlyph).every((p) => p.length === 5)).toBe(
      true,
    )
    expect(data.stats.byGlyph).toHaveProperty('01234')
    expect(Object.values(data.stats.byGlyph).every((n) => n > 0)).toBe(true)
  })

  it('sorts widely-common frequent characters first by default', () => {
    expect(
      data.rows.slice(0, 50).every((r) => r.common === REGIONS.length),
    ).toBe(true)
  })
})

describe('taking either typeface as agreement', () => {
  it('merges differences only the sans faces make', () => {
    // Source Han Sans gives Japan its own 了 and 人; the serif faces do not
    expect(row('了').glyph).toBe('00000')
    expect(row('人').glyph).toBe('00000')
  })

  it('keeps differences both typefaces make', () => {
    // 天 really is written differently in Japan, and both faces say so
    expect(row('天').glyph).toBe('00011')
    expect(row('骨').glyph).not.toBe('00000')
  })
})

describe('per-region stroke counts', () => {
  it('uses stroke-order geometry as the single value everywhere', () => {
    expect(row('以').strokes).toEqual([4, 5, 5, 5, 5])
    expect(row('那').strokes).toEqual([6, 7, 7, 7, 6])
    for (const region of REGIONS)
      expect(strokeDataRef(row('以'), region)).toBeDefined()
  })

  it.each([
    ['摒', 'jp', 14, 'kAlternateTotalStrokes'],
    ['屢', 'jp', 14, 'kRSAdobe_Japan1_6'],
    ['那', 'kr', 6, 'kTotalStrokes'],
  ] as const)(
    'falls back for %s in %s to %i from %s',
    (key, region, strokes) => {
      expect(strokeDataRef(row(key), region)).toBeUndefined()
      expect(row(key).strokes[REGIONS.indexOf(region)]).toBe(strokes)
    },
  )

  it('never leaves a column without a count', () => {
    expect(data.rows.every((r) => r.strokes.every((n) => n > 0))).toBe(true)
  })
})

describe('outside references', () => {
  it('lists every character in the group, each with the full set', () => {
    // 國 is written 国 and 國; both get all nine references
    const groups = dictGroups(row('國'))
    expect(groups.map((g) => g.form.char)).toEqual(['国', '國'])
    expect(groups.every((g) => g.links.length === 9)).toBe(true)
  })

  it('counts a name the group merged with as a character of its own', () => {
    // 唇 and 脣 fill the five columns and name one group
    expect(formsOf(row('唇')).map((f) => f.char)).toEqual(['唇', '脣'])
  })

  it('lists one character when the five regions agree', () => {
    expect(dictGroups(row('的')).map((g) => g.form.char)).toEqual(['的'])
  })

  it('looks every reference up with the character of its own line', () => {
    const links = new Map(dictLinks('國').map((l) => [l.id, l.url]))
    expect(links.get('zdic')).toContain(encodeURIComponent('國'))
    expect(links.get('moedict')).toContain(encodeURIComponent('國'))
    expect(links.get('jisho')).toContain(encodeURIComponent('國'))
    expect(links.get('zitools')).toBe(
      `https://zi.tools/zi/${encodeURIComponent('國')}`,
    )
    expect(links.get('unihan')).toContain('codepoint=570B')
  })

  it('adds NAVER when Korean references are requested', () => {
    expect(dictLinks('島', ['cn']).some((link) => link.id === 'naver')).toBe(
      false,
    )

    const naver = dictLinks('島', ['kr']).find((link) => link.id === 'naver')
    expect(naver).toEqual({
      id: 'naver',
      name: 'NAVER 한자사전',
      region: 'kr',
      url: 'https://hanja.dict.naver.com/#/search?range=letter&query=%E5%B3%B6',
    })
    expect(
      dictGroups(row('的'), {
        formRegions: ['cn'],
        dictionaryRegions: ['kr'],
      })[0]?.links,
    ).toContainEqual(expect.objectContaining({ id: 'naver' }))
  })

  it.each([
    ['cn', ['zdic']],
    ['hk', ['humanum']],
    ['tw', ['moedict']],
    ['jp', ['jitenon', 'jisho']],
    ['kr', ['naver']],
  ] as const)(
    'includes only %s regional dictionaries when that region is active',
    (region, ids) => {
      const regional = dictLinks('國', [region])
        .filter((link) => link.region)
        .map((link) => link.id)
      expect(regional).toEqual(ids)
    },
  )

  it('looks 漢字辞典オンライン up by codepoint', () => {
    // The plain-text form only ever reached the search page
    expect(
      new Map(dictLinks('国').map((l) => [l.id, l.url])).get('jitenon'),
    ).toBe(
      'https://kanji.jitenon.jp/cat/search?getdata=56fd&search=match&how=%E6%BC%A2%E5%AD%97',
    )
  })
})

describe('the pre-reform form as a sixth column', () => {
  it('groups the kyujitai with whichever regions still write it', () => {
    // 國 is what Hong Kong and Taiwan write, so it joins their group
    const guo = row('國')
    expect(guo.glyph).toBe('01101')
    expect(guo.old).toEqual({
      char: '國',
      glyph: 1,
      strokes: 11,
      freq: 1487,
    })
  })

  it('gives it a sixth group when nobody writes that Japanese glyph', () => {
    const xu = row('續')
    expect(xu.glyph).toBe('01234')
    expect(xu.old?.glyph).toBe(5)
  })

  it('never renumbers the five regions to fit it in', () => {
    for (const r of data.rows)
      if (r.old) expect(r.old.glyph).toBeLessThanOrEqual(new Set(r.glyph).size)
  })

  it('uses the unified source priority for new and old Japanese forms', () => {
    expect(row('國').strokes[3]).toBe(8)
    expect(row('國').old?.strokes).toBe(11)
  })

  it('requires an explicit Japanese shinjitai relationship', () => {
    expect(row('柺').old).toBeUndefined()
    for (const entry of data.rows)
      if (entry.old)
        expect(jpShinjitai.get(entry.chars[3])).toContain(entry.old.char)
  })
})

describe('what counts as one character group', () => {
  it('keeps 拐 and 柺 as independently addressable groups', () => {
    expect(row('拐').chars).toEqual(['拐', '拐', '拐', '拐', '拐'])
    expect(row('柺').chars).toEqual(['拐', '枴', '枴', '柺', '柺'])
    expect(row('柺').old).toBeUndefined()
  })

  it('keeps a row for a character its own region lists separately', () => {
    // Taiwan writes 着 as 著, but 著 is an entry of its own in the mainland,
    // Hong Kong and Japanese lists -- 著名 is not 看着
    expect(row('著').chars).toEqual(['著', '著', '著', '著', '著'])
    expect(row('着').chars).toEqual(['着', '着', '著', '着', '着'])
  })

  it.each([
    ['欠', '缺'],
    ['缶', '罐'],
    ['糸', '絲'],
    ['弁', '辯'],
  ])('gives %s a row though Japan writes %s with it', (own, host) => {
    expect(row(own).chars[3]).toBe(own)
    expect(row(host).chars[3]).toBe(own)
  })

  it('does not split a character a list only glosses as a variant', () => {
    // 別﹝别﹞ and 溫〔温〕 are one entry each, not two
    expect(rows.has('别')).toBe(false)
    expect(rows.has('温')).toBe(false)
    expect(row('別').chars).toEqual(['别', '別', '別', '別', '別'])
  })

  it('merges two orthodox forms naming the same group', () => {
    expect(rows.has('脣')).toBe(false)
    expect(row('唇')).toMatchObject({
      chars: ['唇', '脣', '脣', '唇', '脣'],
      aka: ['脣'],
    })
    expect(row('才').aka).toEqual(['纔'])
  })

  it('settles the columns before choosing the key', () => {
    // In the original four columns 稜 fills three and 棱 one, so 稜 keeps the
    // established address after Korea is added.
    expect(row('稜').chars).toEqual(['棱', '稜', '稜', '稜', '棱'])
    expect(rows.has('棱')).toBe(false)
    // A bare 戸 group would fill every column only because OpenCC maps it
    // nowhere; 戶 knows it is 户 on the mainland, and keeps the address.
    expect(row('戶')).toMatchObject({
      chars: ['户', '户', '戶', '戸', '戶'],
      aka: ['戸'],
    })
    expect(rows.has('戸')).toBe(false)
  })

  it('lets a region’s own table override OpenCC’s variant mapping', () => {
    // 常用國字標準字體表 and 常用字字形表 both list 脣, 祕 and 羣; OpenCC
    // converts all three away, to 唇, 秘 and 群
    expect(row('唇').chars).toEqual(['唇', '脣', '脣', '唇', '脣'])
    expect(row('祕').chars).toEqual(['秘', '祕', '祕', '秘', '祕'])
    expect(row('祕').alternatives?.cn).toContainEqual({
      char: '祕',
      tier: 3,
      kind: 'primary',
    })
    expect(row('群').chars).toEqual(['群', '羣', '群', '群', '群'])
    expect(row('峰').chars).toEqual(['峰', '峯', '峰', '峰', '峯'])
  })

  it('keeps 克 and 剋 as separate entries while accounting for regional forms', () => {
    expect(row('克').chars).toEqual(['克', '克', '克', '克', '克'])
    expect(row('剋').chars).toEqual(['克', '剋', '剋', '剋', '剋'])
    expect(row('剋').alternatives?.cn).toContainEqual({
      char: '剋',
      tier: 2,
      kind: 'primary',
    })
  })

  it('folds the forms JPShinjitaiCharacters names alongside themselves', () => {
    // 群 -> 群 羣 says they are one character; 台 -> 臺 says they are two
    expect(rows.has('羣')).toBe(false)
    expect(row('群').aka).toEqual(['羣'])
    expect(row('台').chars).toEqual(['台', '台', '台', '台', '台'])
    expect(row('臺').chars).toEqual(['台', '台', '臺', '台', '臺'])
  })

  it('keeps a simplification that stands for several characters apart', () => {
    // STCharacters has 复 -> 復 複 覆 and 苏 -> 蘇 甦 囌: different characters
    for (const key of ['復', '複', '覆', '蘇', '甦', '囌', '後', '后'])
      expect(rows.has(key)).toBe(true)
    expect(row('復').aka).toBeUndefined()
  })

  it('accounts for every candidate in a one-to-many OpenCC mapping', () => {
    expect(row('逕').alternatives?.cn).toContainEqual({
      char: '迳',
      tier: 3,
      kind: 'primary',
    })
    expect(row('線').alternatives?.cn).toContainEqual({
      char: '缐',
      tier: 3,
      kind: 'primary',
    })
    expect(row('鍾').alternatives?.cn).toContainEqual({
      char: '锺',
      tier: 3,
      kind: 'primary',
    })
    expect(formsOf(row('逕')).map((form) => form.char)).toContain('迳')
  })

  it('does not carry a candidate into regions or groups that do not own it', () => {
    const hasAlternative = (
      key: string,
      region: (typeof REGIONS)[number],
      char: string,
    ) =>
      row(key).alternatives?.[region]?.some((entry) => entry.char === char) ??
      false

    expect(hasAlternative('像', 'cn', '象')).toBe(false)
    for (const region of ['hk', 'tw', 'jp', 'kr'] as const)
      expect(hasAlternative('剋', region, '克')).toBe(false)
    for (const region of ['cn', 'hk', 'jp', 'kr'] as const)
      expect(hasAlternative('着', region, '著')).toBe(false)
    expect(hasAlternative('逕', 'jp', '径')).toBe(false)
  })

  it('splits one-region ambiguity and links both groups without naming it', () => {
    expect(row('鎗').chars).toEqual(['鎗', '鎗', '鎗', '鎗', '鎗'])
    expect(row('鎗').uncertain).toContainEqual({
      key: '槍',
      char: '枪',
      regions: ['cn'],
    })
    expect(row('槍').uncertain).toContainEqual({
      key: '鎗',
      char: '枪',
      regions: ['cn'],
    })
    expect(formsOf(row('鎗')).map((form) => form.char)).not.toContain('枪')
    expect(row('鎗').aka).toBeUndefined()
    expect(row('鎗').alternatives).toBeUndefined()
  })

  it('keeps the original four columns while Korea uses its encoded form', () => {
    // JPShinjitaiCharacters records pre-reform shapes -- 郎 -> 郞, 研 -> 硏,
    // 晃 -> 晄 -- as plain orthodox forms, and they used to become the key and
    // then fill the other base columns with a form no place writes.
    const examples = [
      ['郎', '郞'],
      ['研', '硏'],
      ['晃', '晄'],
      ['萌', '萠'],
      ['慎', '愼'],
      ['概', '槪'],
      ['瓶', '甁'],
      ['翻', '飜'],
    ] as const
    for (const [key, korean] of examples)
      expect(row(key).chars).toEqual([key, key, key, key, korean])
    expect(row('郎').tier).toEqual([1, 1, 1, 1, 1])
    expect(rows.has('郞')).toBe(false)
    expect(row('郎').aka).toEqual(['郞'])
  })

  it('keeps a form a region files under a secondary list', () => {
    // 檯 is 次常用國字, so Taiwan writes it even though the primary table has
    // only 台 -- swapping in 台 would be a different character
    expect(row('檯').chars).toEqual(['台', '枱', '檯', '檯', '檯'])
    expect(row('台').chars).toEqual(['台', '台', '台', '台', '台'])
  })

  it('hands Japan a shinjitai its own tables carry', () => {
    // Several shinjitai share one orthodox form; taking whichever came first
    // gave 鹽 the unlisted 䀋 and 莊 the unlisted 庄
    expect(row('鹽').chars[3]).toBe('塩')
    expect(row('莊').chars[3]).toBe('荘')
  })

  it('lists every row under at least one region', () => {
    for (const r of data.rows) {
      expect(r.common).toBeGreaterThanOrEqual(1)
      expect(r.common).toBeLessThanOrEqual(REGIONS.length)
      expect(r.common).toBe(r.tier.filter(Boolean).length)
    }
  })

  it('leaves no two rows carrying the same regional characters', () => {
    const tuples = new Set(data.rows.map((r) => r.chars.join('')))
    expect(tuples.size).toBe(data.rows.length)
  })

  it('leaves no two rows with the same key', () => {
    expect(new Set(data.rows.map((entry) => entry.key)).size).toBe(
      data.rows.length,
    )
  })
})

describe('regional listing state', () => {
  const state = (tier: number, primary: boolean) => ({
    tier,
    listing: tier ? (primary ? 'primary' : 'glossed') : 'unlisted',
  })
  const expected = (region: number, char: string) => {
    switch (region) {
      case 0:
        return state(
          covered['cn-1'].has(char)
            ? 1
            : covered['cn-2'].has(char)
              ? 2
              : covered['cn-3'].has(char)
                ? 3
                : 0,
          entered['cn-1'].has(char) ||
            entered['cn-2'].has(char) ||
            entered['cn-3'].has(char),
        )
      case 1:
        return state(
          covered['hk-common'].has(char) ? 1 : 0,
          entered['hk-common'].has(char),
        )
      case 2:
        return state(
          covered['tw-common'].has(char)
            ? 1
            : covered['tw-sub'].has(char)
              ? 2
              : 0,
          entered['tw-common'].has(char) || entered['tw-sub'].has(char),
        )
      case 3:
        return state(
          covered['jp-grade'].has(char)
            ? 2
            : covered['jp-joyo'].has(char)
              ? 1
              : 0,
          entered['jp-joyo'].has(char) || entered['jp-grade'].has(char),
        )
      default:
        return state(
          covered['kr-basic'].has(char) ? 1 : 0,
          entered['kr-basic'].has(char),
        )
    }
  }

  it('matches primary, bracketed and absent source data for every cell', () => {
    for (const entry of data.rows)
      for (const [region, char] of entry.chars.entries()) {
        const wanted = expected(region, char)
        expect(entry.tier[region], `${entry.key}.${REGIONS[region]} tier`).toBe(
          wanted.tier,
        )
        expect(
          entry.listing[region],
          `${entry.key}.${REGIONS[region]} listing`,
        ).toBe(wanted.listing)
      }
  })

  it('exposes all three states', () => {
    expect(row('國').listing[0]).toBe('primary')
    expect(row('麵').listing[1]).toBe('glossed')
    expect(row('鎗').listing[0]).toBe('unlisted')
  })
})

describe('source-entry accounting', () => {
  const specifications = [
    [['cn-1', 'cn-2', 'cn-3'], 0],
    [['hk-common'], 1],
    [['tw-common'], 2],
    [['jp-joyo'], 3],
    [['kr-basic'], 4],
  ] as const

  it('selects or records every primary entry from the row-generating lists', () => {
    for (const [lists, region] of specifications) {
      const source = new Set(
        lists.flatMap((name) =>
          parsePrimaryCharList(
            readFileSync(join(RAW_DIR, 'charlist', `${name}.txt`), 'utf8'),
          ),
        ),
      )
      const id = REGIONS[region]
      for (const char of source)
        expect(
          data.rows.some(
            (entry) =>
              entry.chars[region] === char ||
              entry.alternatives?.[id]?.some(
                (alternative) => alternative.char === char,
              ),
          ),
          `${id}:${char} is neither selected nor accounted for`,
        ).toBe(true)
    }
  })

  it('fills gaps in TSCharacters from the reverse ST mapping', () => {
    expect(row('暱').chars[0]).toBe('昵')
    expect(row('穭').chars[0]).toBe('稆')
  })

  it.each([
    ['𡑍', '𫭼'],
    ['𣈶', '暅'],
    ['𥗽', '𬒗'],
  ])(
    'keeps the explicit %s mapping when bundled fonts only cover %s',
    (orthodox, mainland) => {
      expect(row(orthodox)).toMatchObject({
        chars: [mainland, orthodox, orthodox, orthodox, orthodox],
        cp: '01111',
        glyph: '01111',
        supplementalFont: {
          sans: ['hk', 'tw', 'jp', 'kr'],
          serif: ['hk', 'tw', 'jp', 'kr'],
        },
      })
      expect(row(orthodox).tier[0]).toBeGreaterThan(0)
    },
  )

  it('does not duplicate the selected form among regional alternatives', () => {
    for (const entry of data.rows)
      for (const [region, id] of REGIONS.entries()) {
        const alternatives = entry.alternatives?.[id] ?? []
        expect(alternatives.every((item) => item.tier > 0)).toBe(true)
        expect(alternatives.map((item) => item.char)).not.toContain(
          entry.chars[region],
        )
        expect(new Set(alternatives.map((item) => item.char)).size).toBe(
          alternatives.length,
        )
      }
  })

  it('never assigns an alternative to another final group', () => {
    const namedBy = new Map(
      data.rows.flatMap((entry) =>
        [entry.key, ...(entry.aka ?? [])].map(
          (name) => [name, entry.key] as const,
        ),
      ),
    )
    for (const entry of data.rows)
      for (const region of REGIONS)
        for (const alternative of entry.alternatives?.[region] ?? [])
          expect(
            !namedBy.has(alternative.char) ||
              namedBy.get(alternative.char) === entry.key,
            `${entry.key}.${region}:${alternative.char}`,
          ).toBe(true)
  })

  it('keeps Taiwan secondary-only characters outside row generation', () => {
    const represented = new Set(
      data.rows.flatMap((entry) => formsOf(entry).map((form) => form.char)),
    )
    const outside = [...entered['tw-sub']].filter(
      (char) => !represented.has(char),
    )
    expect(entered['tw-sub'].size).toBe(6343)
    expect(outside).toHaveLength(3599)
    expect(outside).toContain('丌')
  })
})

describe('Korean education hanja', () => {
  it('accounts for all 1,800 entries in the 2000 basic list', () => {
    expect(entered['kr-basic'].size).toBe(1800)
    expect(data.rows.filter((entry) => entry.tier[4] === 1)).toHaveLength(1800)
  })

  it.each([
    ['青', '靑'],
    ['清', '淸'],
    ['雞', '鷄'],
    ['衰', '𮕩'],
    ['郎', '郞'],
  ])('puts the Korean form %s/%s in the same row', (key, korean) => {
    expect(row(key).chars[4]).toBe(korean)
    expect(rows.has(korean)).toBe(false)
  })

  it('adds the Korean-only common character 畓', () => {
    expect(row('畓').tier).toEqual([0, 0, 0, 0, 1])
    expect(row('畓').listing[4]).toBe('primary')
  })
})
