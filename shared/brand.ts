/** The public-facing line shared by metadata and generated brand imagery. */
export const BRAND_SLOGAN = '一字之间，照见五地字形'

/** The canonical Simplified Chinese project bio. */
export const BRAND_DESCRIPTION =
  '汉智（Hanji）把同一个汉字并排与叠印，对照中国大陆、香港、台湾、日本和韩国的字形差异，并提供Unicode码点、笔画、字频、读音、字表收录与笔顺信息。'

/** Shared browser and social metadata. */
export const LOGO_PATH = '/logo.svg'
export const TWITTER_SITE = '@sanxiaozhizi'
export const THEME_COLOR_LIGHT = '#fbfaf7'
export const THEME_COLOR_DARK = '#121215'

export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630
export const OG_IMAGE_TYPE = 'image/png'

export const HOME_OG_PATH = '/og/home.png'
export const ABOUT_OG_PATH = '/og/about.png'

export const charOgPath = (key: string): string =>
  `/og/char/${encodeURIComponent(key)}.png`
