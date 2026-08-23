import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { frequencyRankOf } from '../../shared/frequency.ts'
import {
  DATA_DIR,
  parseCountFrequencyCsv,
  parseTaiwanFrequency,
  RAW_DIR,
} from '../sources.ts'
import type { CharRow, CharsData } from '../../shared/types.ts'

const data: CharsData = JSON.parse(
  readFileSync(join(DATA_DIR, 'chars.json'), 'utf8'),
)
const rows = new Map(data.rows.map((row) => [row.key, row]))
const row = (key: string): CharRow => {
  const found = rows.get(key)
  if (!found) throw new Error(`${key} is not listed`)
  return found
}

describe('frequency source normalization', () => {
  it('ranks only Han characters, keeps count ties, and reads quoted CSV', () => {
    const ranks = parseCountFrequencyCsv(
      'char,count\r\n"字",10\r\n"𠮟",10\r\n"\n",99\r\nA,100\r\n次,5\r\n',
      0,
      1,
    )
    expect([...ranks]).toEqual([
      ['字', 1],
      ['𠮟', 1],
      ['次', 3],
    ])
  })

  it('reads the combined Taiwan corpus sheet by name', () => {
    const ranks = parseTaiwanFrequency(
      readFileSync(join(RAW_DIR, 'frequency', 'naer-112.xlsx')),
    )
    expect(ranks.get('的')).toBe(1)
    expect(ranks.get('國')).toBe(43)
    expect(ranks.get('国')).toBe(2878)
  })
})

describe('regional frequency data', () => {
  it('stores CN, HK, TW and JP ranks in regional tuple order', () => {
    expect(row('的').freq).toEqual([1, 63, 1, 55, null])
    expect(row('國').freq).toEqual([20, 146, 43, 11, null])
    expect(row('國').old?.freq).toBe(1487)
  })

  it('has no Korean frequency rank', () => {
    expect(data.rows.every((entry) => entry.freq?.[4] == null)).toBe(true)
  })

  it('looks up a row rank by region without exposing tuple positions', () => {
    expect(frequencyRankOf(row('國'), 'hk')).toBe(146)
    expect(frequencyRankOf(row('國'), 'jp')).toBe(11)
  })
})
