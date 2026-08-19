// @unocss-include -- DictLink.icon holds UnoCSS icon classes
import { fontRegionOf } from './row.ts'
import { REGIONS, type CharRow, type Region } from './types.ts'

export const REPO_URL = 'https://github.com/sxzz/hanji'
export const ISSUES_URL = `${REPO_URL}/issues`

export interface DictLink {
  id: string
  name: string
  /** The region whose dictionary this is, if it belongs to one. */
  region?: Region
  /** UnoCSS icon class, for references that have a mark of their own. */
  icon?: string
  url: string
}

/** A character the group is written with, and the font that draws it. */
export interface Form {
  char: string
  font: Region
}

/**
 * Every distinct character in the group: the four columns, plus the orthodox
 * forms that name it -- 唇 alongside 脣, 国 alongside 國.
 *
 * The references are listed per character rather than per region, because a
 * reader looking something up has a character in mind, and most dictionaries
 * carry the variants as entries of their own. One that does not simply
 * answers nothing, which costs the reader a click and no more.
 */
export function formsOf(row: CharRow): Form[] {
  const out: Form[] = []
  const add = (char: string, font: Region) => {
    if (char && out.every((form) => form.char !== char))
      out.push({ char, font })
  }
  for (const [index] of row.chars.entries())
    add(row.chars[index]!, fontRegionOf(row, index))
  // The key and the names it merged with are not always a column of their own
  add(row.key, 'cn')
  for (const name of row.aka ?? []) add(name, 'cn')
  for (const region of REGIONS)
    for (const entry of row.alternatives?.[region] ?? [])
      add(entry.char, region)
  return out
}

const enc = encodeURIComponent
const hex = (char: string) => char.codePointAt(0)!.toString(16)

/** Outside references for one character. */
export function dictLinks(char: string): DictLink[] {
  return [
    {
      id: 'zdic',
      name: '汉典',
      region: 'cn',
      url: `https://www.zdic.net/hans/${enc(char)}`,
    },
    {
      id: 'humanum',
      name: '漢語多功能字庫',
      region: 'hk',
      url: `https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=${enc(char)}`,
    },
    {
      id: 'moedict',
      name: '萌典',
      region: 'tw',
      url: `https://www.moedict.tw/${enc(char)}`,
    },
    {
      id: 'jitenon',
      name: '漢字辞典オンライン',
      region: 'jp',
      // Looked up by codepoint rather than by the character: the plain-text
      // form only reaches the search page, this one lands on the entry.
      url: `https://kanji.jitenon.jp/cat/search?getdata=${hex(char)}&search=match&how=${enc('漢字')}`,
    },
    {
      id: 'jisho',
      name: 'Jisho',
      region: 'jp',
      url: `https://jisho.org/search/${enc(char)}%20%23kanji`,
    },
    {
      id: 'wiktionary',
      name: 'Wiktionary',
      icon: 'i-ooui-logo-wiktionary',
      url: `https://en.wiktionary.org/wiki/${enc(char)}`,
    },
    {
      id: 'unihan',
      name: 'Unihan',
      icon: 'i-simple-icons-unicode',
      url: `https://www.unicode.org/cgi-bin/GetUnihanData.pl?codepoint=${hex(char).toUpperCase()}`,
    },
  ]
}

/** Every character the group is written with, each with its references. */
export function dictGroups(row: CharRow): { form: Form; links: DictLink[] }[] {
  return formsOf(row).map((form) => ({ form, links: dictLinks(form.char) }))
}
