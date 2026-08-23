/** The public-facing line shared by metadata and generated brand imagery. */
export const BRAND_SLOGAN = '一字之间，照见五地字形'

/** The canonical Simplified Chinese project bio. */
export const BRAND_DESCRIPTION =
  '把同一个汉字并排、叠印，照见中国大陆、香港、台湾、日本与韩国之间细微而真实的字形差异。'

export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

export const HOME_OG_PATH = '/og/home.png'
export const ABOUT_OG_PATH = '/og/about.png'

export const charOgPath = (key: string): string =>
  `/og/char/${encodeURIComponent(key)}.png`
