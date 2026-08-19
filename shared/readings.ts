const COMBINING = /\p{Diacritic}/gu
const PINYIN_UMLAUT_U = /[üǖǘǚǜ]/gu

/** Lower-case and strip tone marks, while preserving pinyin ü as v. */
export const plainReading = (text: string) =>
  text
    .normalize('NFC')
    .toLowerCase()
    .replaceAll(PINYIN_UMLAUT_U, 'v')
    .normalize('NFD')
    .replaceAll(COMBINING, '')
