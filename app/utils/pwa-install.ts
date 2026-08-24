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

export type PwaInstallMode = 'native'

export interface PwaInstallEnvironment {
  promptAvailable: boolean
  standalone: boolean
  userAgent: string
  platform: string
  maxTouchPoints: number
}

/**
 * Only expose installation when the browser supplies a prompt the control can
 * invoke directly. Platforms that require a manual browser-menu flow stay
 * hidden instead of presenting a control that cannot perform its named action.
 */
export function detectPwaInstallMode({
  promptAvailable,
  standalone,
}: PwaInstallEnvironment): PwaInstallMode | null {
  return !standalone && promptAvailable ? 'native' : null
}
