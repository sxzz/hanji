/**
 * Validates the generated chars.json.
 *
 * These are golden samples measured from the Adobe CMaps while planning, so a
 * change upstream shows up here instead of silently reaching the page.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dictGroups, dictLinks, formsOf } from '../../shared/links.ts'
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

describe('glyph partitions, columns in CN HK TW JP order', () => {
  it.each([
    ['骨', '0121', 'CN | HK+JP | TW'],
    ['返', '0123', 'all four differ'],
    ['青', '0010', 'TW alone'],
    ['海', '0001', 'JP alone'],
    ['直', '0102', 'CN+TW | HK | JP'],
    ['次', '0012', 'CN+HK | TW | JP'],
    ['天', '0001', 'JP alone, and the serif faces agree'],
  ])('%s is %s (%s)', (key, signature) => {
    expect(row(key).glyph).toBe(signature)
  })

  it.each(['一', '者', '的', '了', '人', '子', '水', '金'])(
    'counts %s as written the same way everywhere',
    (key) => {
      expect(row(key).glyph).toBe('0000')
    },
  )

  it('lists characters written identically everywhere too', () => {
    // This is a dictionary of the four regions' common characters, not only
    // of the differences between them
    expect(data.stats.identical).toBeGreaterThan(1000)
    expect(data.rows.some((r) => r.glyph === '0000')).toBe(true)
  })
})

describe('character grouping', () => {
  it('keys 国 under its orthodox form and fills each column', () => {
    expect(row('國')).toMatchObject({
      chars: ['国', '國', '國', '国'],
      old: { char: '國', glyph: 1, strokes: 11 },
      cp: '0110',
    })
  })

  it('splits 发 into the two orthodox characters it stands for', () => {
    expect(row('發').chars).toEqual(['发', '發', '發', '発'])
    expect(row('髮').chars).toEqual(['发', '髮', '髮', '髪'])
  })

  it('puts the shinjitai in the jp column and the kyujitai in old', () => {
    expect(row('澤')).toMatchObject({
      chars: ['泽', '澤', '澤', '沢'],
      old: { char: '澤', glyph: 3, strokes: 16 },
    })
  })

  it('has no old form when all four share a codepoint', () => {
    expect(row('骨').old).toBeUndefined()
  })

  it('counts bracketed variants in the HK list, as in 台〔臺〕', () => {
    expect(row('臺').tier[1]).toBe(1)
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

  it('has an instance of all 15 partitions', () => {
    expect(Object.keys(data.stats.byGlyph)).toHaveLength(15)
    expect(Object.values(data.stats.byGlyph).every((n) => n > 0)).toBe(true)
  })

  it('sorts widely-common frequent characters first by default', () => {
    expect(data.rows.slice(0, 50).every((r) => r.common === 4)).toBe(true)
  })
})

describe('taking either typeface as agreement', () => {
  it('merges differences only the sans faces make', () => {
    // Source Han Sans gives Japan its own 了 and 人; the serif faces do not
    expect(row('了').glyph).toBe('0000')
    expect(row('人').glyph).toBe('0000')
  })

  it('keeps differences both typefaces make', () => {
    // 天 really is written differently in Japan, and both faces say so
    expect(row('天').glyph).toBe('0001')
    expect(row('骨').glyph).not.toBe('0000')
  })
})

describe('per-region stroke counts', () => {
  it.each([
    // kAlternateTotalStrokes names Japan outright and outranks everything else
    ['卿', 12, 'kAlternateTotalStrokes 12:JK'],
    ['祁', 8, 'kAlternateTotalStrokes 8:J, over Adobe’s 7'],
    // Japan draws these with a stroke fewer, and kRSAdobe_Japan1_6 says so
    ['突', 8, '穴 over 大, not 犬'],
    ['海', 9, '毎, not 每'],
    ['器', 15, '大 in the middle, not 犬'],
    ['類', 18, '大, not 犬'],
    // Same shape everywhere, but Japan counts 阝 as three strokes
    ['那', 7, 'convention, not shape'],
    ['都', 11, 'convention, not shape'],
  ])('gives %s %i strokes in Japan (%s)', (key, strokes) => {
    expect(row(key).strokes[3]).toBe(strokes)
  })

  it('leaves the other three columns on kTotalStrokes', () => {
    // zh-Hans first, zh-Hant second; HK and TW share the second
    expect(row('那').strokes).toEqual([6, 6, 6, 7])
    expect(row('國').strokes).toEqual([8, 11, 11, 8])
  })

  it('never leaves a column without a count', () => {
    expect(data.rows.every((r) => r.strokes.every((n) => n > 0))).toBe(true)
  })
})

describe('outside references', () => {
  it('lists every character in the group, each with the full set', () => {
    // 國 is written 国 and 國; both get all seven references
    const groups = dictGroups(row('國'))
    expect(groups.map((g) => g.form.char)).toEqual(['国', '國'])
    expect(groups.every((g) => g.links.length === 7)).toBe(true)
  })

  it('counts a name the group merged with as a character of its own', () => {
    // 唇 fills all four columns; 脣 only names the group
    expect(formsOf(row('唇')).map((f) => f.char)).toEqual(['唇', '脣'])
  })

  it('lists one character when the four regions agree', () => {
    expect(dictGroups(row('的')).map((g) => g.form.char)).toEqual(['的'])
  })

  it('looks every reference up with the character of its own line', () => {
    const links = new Map(dictLinks('國').map((l) => [l.id, l.url]))
    expect(links.get('zdic')).toContain(encodeURIComponent('國'))
    expect(links.get('moedict')).toContain(encodeURIComponent('國'))
    expect(links.get('jisho')).toContain(encodeURIComponent('國'))
    expect(links.get('unihan')).toContain('codepoint=570B')
  })

  it('looks 漢字辞典オンライン up by codepoint', () => {
    // The plain-text form only ever reached the search page
    expect(
      new Map(dictLinks('国').map((l) => [l.id, l.url])).get('jitenon'),
    ).toBe(
      'https://kanji.jitenon.jp/cat/search?getdata=56fd&search=match&how=%E6%BC%A2%E5%AD%97',
    )
  })
})

describe('the pre-reform form as a fifth column', () => {
  it('groups the kyujitai with whichever regions still write it', () => {
    // 國 is what Hong Kong and Taiwan write, so it joins their group
    const guo = row('國')
    expect(guo.glyph).toBe('0110')
    expect(guo.old).toEqual({ char: '國', glyph: 1, strokes: 11 })
  })

  it('gives it a group of its own when nobody writes it', () => {
    // 說 already differs in all four; the kyujitai makes a fifth form
    const shuo = row('說')
    expect(shuo.glyph).toBe('0123')
    expect(shuo.old?.glyph).toBe(4)
  })

  it('never renumbers the four regions to fit it in', () => {
    for (const r of data.rows)
      if (r.old) expect(r.old.glyph).toBeLessThanOrEqual(new Set(r.glyph).size)
  })

  it('counts its strokes by the Japanese rule', () => {
    // 國 is 11 strokes, and Japan writes 国 in 8
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
    expect(row('拐').chars).toEqual(['拐', '拐', '拐', '拐'])
    expect(row('柺').chars).toEqual(['拐', '枴', '枴', '柺'])
    expect(row('柺').old).toBeUndefined()
  })

  it('keeps a row for a character its own region lists separately', () => {
    // Taiwan writes 着 as 著, but 著 is an entry of its own in the mainland,
    // Hong Kong and Japanese lists -- 著名 is not 看着
    expect(row('著').chars).toEqual(['著', '著', '著', '著'])
    expect(row('着').chars).toEqual(['着', '着', '著', '着'])
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
    expect(row('別').chars).toEqual(['别', '別', '別', '別'])
  })

  it('merges two orthodox forms naming the same group', () => {
    expect(rows.has('脣')).toBe(false)
    expect(row('唇')).toMatchObject({
      chars: ['唇', '脣', '脣', '唇'],
      aka: ['脣'],
    })
    expect(row('才').aka).toEqual(['纔'])
  })

  it('settles the columns before choosing the key', () => {
    // 稜 fills three columns and 棱 one, so 稜 keeps the address
    expect(row('稜').chars).toEqual(['棱', '稜', '稜', '稜'])
    expect(rows.has('棱')).toBe(false)
    // 戸 fills all four of its own columns only because OpenCC maps it
    // nowhere; 戶 knows it is 户 on the mainland, and keeps the address
    expect(row('戶')).toMatchObject({
      chars: ['户', '户', '戶', '戸'],
      aka: ['戸'],
    })
    expect(rows.has('戸')).toBe(false)
  })

  it('lets a region’s own table override OpenCC’s variant mapping', () => {
    // 常用國字標準字體表 and 常用字字形表 both list 脣, 祕 and 羣; OpenCC
    // converts all three away, to 唇, 秘 and 群
    expect(row('唇').chars).toEqual(['唇', '脣', '脣', '唇'])
    expect(row('祕').chars).toEqual(['秘', '祕', '祕', '秘'])
    expect(row('祕').alternatives?.cn).toContainEqual({
      char: '祕',
      tier: 3,
      kind: 'primary',
    })
    expect(row('群').chars).toEqual(['群', '羣', '群', '群'])
    expect(row('峰').chars).toEqual(['峰', '峯', '峰', '峰'])
  })

  it('keeps 克 and 剋 as separate entries while accounting for regional forms', () => {
    expect(row('克').chars).toEqual(['克', '克', '克', '克'])
    expect(row('剋').chars).toEqual(['克', '剋', '剋', '剋'])
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
    expect(row('台').chars).toEqual(['台', '台', '台', '台'])
    expect(row('臺').chars).toEqual(['台', '台', '臺', '台'])
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
    for (const region of ['hk', 'tw', 'jp'] as const)
      expect(hasAlternative('剋', region, '克')).toBe(false)
    for (const region of ['cn', 'hk', 'jp'] as const)
      expect(hasAlternative('着', region, '著')).toBe(false)
    expect(hasAlternative('逕', 'jp', '径')).toBe(false)
  })

  it('splits one-region ambiguity and links both groups without naming it', () => {
    expect(row('鎗').chars).toEqual(['鎗', '鎗', '鎗', '鎗'])
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

  it('never shows a region a form its own table does not enter', () => {
    // JPShinjitaiCharacters records pre-reform shapes -- 郎 -> 郞, 研 -> 硏,
    // 晃 -> 晄 -- as plain orthodox forms, and they used to become the key and
    // then fill three columns no place writes, with a listing level of zero
    for (const key of ['郎', '研', '晃', '萌', '慎', '概', '瓶', '翻'])
      expect(row(key).chars).toEqual([key, key, key, key])
    expect(row('郎').tier).toEqual([1, 1, 1, 1])
    expect(rows.has('郞')).toBe(false)
    expect(row('郎').aka).toEqual(['郞'])
  })

  it('keeps a form a region files under a secondary list', () => {
    // 檯 is 次常用國字, so Taiwan writes it even though the primary table has
    // only 台 -- swapping in 台 would be a different character
    expect(row('檯').chars).toEqual(['台', '枱', '檯', '檯'])
    expect(row('台').chars).toEqual(['台', '台', '台', '台'])
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
      expect(r.common).toBeLessThanOrEqual(4)
      expect(r.common).toBe(r.tier.filter(Boolean).length)
    }
  })

  it('leaves no two rows carrying the same four characters', () => {
    const quads = new Set(data.rows.map((r) => r.chars.join('')))
    expect(quads.size).toBe(data.rows.length)
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
      default:
        return state(
          covered['jp-grade'].has(char)
            ? 2
            : covered['jp-joyo'].has(char)
              ? 1
              : 0,
          entered['jp-joyo'].has(char) || entered['jp-grade'].has(char),
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

  it('keeps drawable entries when their mapped form cannot be rendered', () => {
    for (const char of ['𫭼', '暅', '𬒗']) {
      expect(row(char).chars).toEqual([char, char, char, char])
      expect(row(char).tier[0]).toBeGreaterThan(0)
    }
  })

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
