export const PWA_INSTALL_DISMISSED_KEY = 'hanji:pwa-install-dismissed'
export const PWA_INSTALL_PROMPT_READY_EVENT = 'hanji:pwa-install-prompt-ready'

/**
 * Chromium can decide that the page is installable before Nuxt's post plugin
 * has mounted. Capture the one-shot event in the document head so the Vue UI
 * can consume it whenever hydration finishes.
 */
export const PWA_INSTALL_CAPTURE_SCRIPT = `
try{
window.addEventListener('beforeinstallprompt',function(e){
e.preventDefault();window.__hanjiPwaInstallPrompt=e;
window.dispatchEvent(new Event('${PWA_INSTALL_PROMPT_READY_EVENT}'));
});
window.addEventListener('appinstalled',function(){window.__hanjiPwaInstallPrompt=null});
}catch(e){}`

export type PwaInstallMode = 'native' | 'ios' | 'android' | 'macos-safari'

export interface PwaInstallEnvironment {
  promptAvailable: boolean
  standalone: boolean
  userAgent: string
  platform: string
  maxTouchPoints: number
}

const IOS_DEVICE = /iPhone|iPad|iPod/
const ANDROID = /Android/
const MAC = /Macintosh|Mac OS X/
const SAFARI_VERSION = /Version\/(\d+)/
const SAFARI_ENGINE = /Safari\//
const OTHER_WEBKIT_BROWSER = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser/

/**
 * Pick the installation path the current browser can actually offer. Native
 * browser prompts always win; the remaining modes describe where a reader can
 * find the platform's manual install command.
 */
export function detectPwaInstallMode({
  promptAvailable,
  standalone,
  userAgent,
  platform,
  maxTouchPoints,
}: PwaInstallEnvironment): PwaInstallMode | null {
  if (standalone) return null
  if (promptAvailable) return 'native'

  const ipadDesktopMode = platform === 'MacIntel' && maxTouchPoints > 1
  if (IOS_DEVICE.test(userAgent) || ipadDesktopMode) return 'ios'
  if (ANDROID.test(userAgent)) return 'android'

  const safariVersion = userAgent.match(SAFARI_VERSION)?.[1]
  const mac = MAC.test(userAgent) || platform.startsWith('Mac')
  if (
    mac &&
    safariVersion &&
    Number(safariVersion) >= 17 &&
    SAFARI_ENGINE.test(userAgent) &&
    !OTHER_WEBKIT_BROWSER.test(userAgent)
  )
    return 'macos-safari'

  return null
}
