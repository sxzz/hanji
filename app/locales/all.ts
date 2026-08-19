import { zhCN } from './zh-cn.ts'
import { zhHK } from './zh-hk.ts'
import { zhTW } from './zh-tw.ts'
import { LOCALES, type Locale, type Messages } from './index.ts'

/**
 * Every locale at once, for the build only.
 *
 * scripts/build-fonts.ts has to know the whole interface copy to cut a subset
 * per language. The app must never import this: it would pull every locale
 * into the bundle and undo the lazy loading in index.ts.
 */
export const messages: Record<Locale, Messages> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'zh-HK': zhHK,
}

export { LOCALES, type Locale }
