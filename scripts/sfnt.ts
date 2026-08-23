import { Buffer } from 'node:buffer'

export interface SfntNames {
  family: string
  fullName?: string
  postscriptName: string
}

interface TableRecord {
  directoryOffset: number
  offset: number
  length: number
}

const uint32 = (value: number) => value >>> 0

function tableRecords(font: Buffer): Map<string, TableRecord> {
  const tables = new Map<string, TableRecord>()
  const count = font.readUInt16BE(4)
  for (let index = 0; index < count; index++) {
    const directoryOffset = 12 + index * 16
    const tag = font.toString('ascii', directoryOffset, directoryOffset + 4)
    tables.set(tag, {
      directoryOffset,
      offset: font.readUInt32BE(directoryOffset + 8),
      length: font.readUInt32BE(directoryOffset + 12),
    })
  }
  return tables
}

function checksum(font: Buffer, offset: number, length: number): number {
  let sum = 0
  const end = offset + Math.ceil(length / 4) * 4
  for (let cursor = offset; cursor < end; cursor += 4) {
    let word = 0
    for (let byte = 0; byte < 4; byte++)
      word = (word << 8) | (font[cursor + byte] ?? 0)
    sum = uint32(sum + uint32(word))
  }
  return sum
}

function encodedName(platform: number, value: string): Buffer {
  if (platform !== 0 && platform !== 3) return Buffer.from(value, 'ascii')
  const encoded = Buffer.alloc(value.length * 2)
  for (let index = 0; index < value.length; index++)
    encoded.writeUInt16BE(value.codePointAt(index)!, index * 2)
  return encoded
}

/**
 * Replace the user-facing names in an SFNT font without disturbing its
 * copyright and licence records. Every replacement is shorter than the
 * upstream name, so the name table can retain its existing storage offsets.
 * HarfBuzz rebuilds the table when it creates the final subset.
 */
export function renameSfnt(font: Buffer, names: SfntNames): Buffer {
  const output = Buffer.from(font)
  const tables = tableRecords(output)
  const name = tables.get('name')
  const head = tables.get('head')
  if (!name || !head) throw new Error('font has no name or head table')

  const count = output.readUInt16BE(name.offset + 2)
  const strings = name.offset + output.readUInt16BE(name.offset + 4)
  const fullName = names.fullName ?? names.family
  const replacements: Partial<Record<number, string>> = {
    1: names.family,
    3: names.postscriptName,
    4: fullName,
    6: names.postscriptName,
    16: names.family,
    21: names.family,
    25: names.postscriptName.replace(/-Regular$/, ''),
  }

  for (let index = 0; index < count; index++) {
    const record = name.offset + 6 + index * 12
    const value = replacements[output.readUInt16BE(record + 6)]
    if (!value) continue
    const encoded = encodedName(output.readUInt16BE(record), value)
    const capacity = output.readUInt16BE(record + 8)
    if (encoded.length > capacity)
      throw new Error(`replacement font name is too long: ${value}`)
    const offset = strings + output.readUInt16BE(record + 10)
    output.fill(0, offset, offset + capacity)
    encoded.copy(output, offset)
    output.writeUInt16BE(encoded.length, record + 8)
  }

  // Keep the input font internally consistent before handing it to HarfBuzz.
  output.writeUInt32BE(
    checksum(output, name.offset, name.length),
    name.directoryOffset + 4,
  )
  output.writeUInt32BE(0, head.offset + 8)
  output.writeUInt32BE(
    checksum(output, head.offset, head.length),
    head.directoryOffset + 4,
  )
  output.writeUInt32BE(
    uint32(0xb1b0afba - checksum(output, 0, output.length)),
    head.offset + 8,
  )
  return output
}
