const HOME_PATH = '/'
const DETAIL_PATH = /^\/char\/[^/]+\/?$/

/** Only the list and a character detail are allowed to morph into each other. */
export function shouldUseViewTransition(fromPath: string, toPath: string) {
  const fromHome = fromPath === HOME_PATH
  const toHome = toPath === HOME_PATH
  const fromDetail = DETAIL_PATH.test(fromPath)
  const toDetail = DETAIL_PATH.test(toPath)

  return (fromHome && toDetail) || (fromDetail && toHome)
}
