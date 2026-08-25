import { expect, it } from 'vitest'
import { parseCMap, partitionSignature } from '../scripts/cmap.ts'

it('expands cidrange blocks incrementally', () => {
  const map = parseCMap(`
1 begincidrange
<00004e00> <00004e02> 9506
endcidrange
`)
  expect(map.get(0x4e00)).toBe(9506)
  expect(map.get(0x4e01)).toBe(9507)
  expect(map.get(0x4e02)).toBe(9508)
  expect(map.get(0x4e03)).toBeUndefined()
})

it('reads cidchar blocks', () => {
  const map = parseCMap(`
1 begincidchar
<00009aa8> 45129
endcidchar
`)
  expect(map.get(0x9aa8)).toBe(45129)
})

it('lets cidchar override cidrange', () => {
  const map = parseCMap(`
1 begincidrange
<00000041> <0000005a> 100
endcidrange
1 begincidchar
<00000042> 999
endcidchar
`)
  expect(map.get(0x41)).toBe(100)
  expect(map.get(0x42)).toBe(999)
})

it.each([
  [[1, 1, 1, 1], '0000'],
  [[1, 2, 3, 4], '0123'],
  [[1, 2, 2, 3], '0112'],
  [[1, 2, 3, 3], '0122'],
  [[1, 1, 2, 2], '0011'],
  [[1, 2, 1, 3], '0102'],
  [[1, 2, 3, 4, 5], '01234'],
  [[1, 2, 3, 2, 2], '01211'],
])('signs partition %j as %s', (values, signature) => {
  expect(partitionSignature(values)).toBe(signature)
})
