import { STYLES, type Style } from '~~/shared/types.ts'

export const STYLE_KEY = 'hanji:style'
export const COLOR_KEY = 'hanji:color'

/**
 * Typeface for the whole interface, remembered across visits.
 *
 * This is a reading preference rather than part of a result set, so it lives
 * in localStorage and stays out of the URL. app.vue applies it to the root
 * element before first paint, so the page never flashes the wrong face.
 */
export function useStyle() {
  const stored = useLocalStorage<Style>(STYLE_KEY, 'sans')
  return computed<Style>({
    get: () => (STYLES.includes(stored.value) ? stored.value : 'sans'),
    set: (value) => (stored.value = value),
  })
}

/**
 * Runs in <head> before anything is painted, so a reader who chose serif or
 * dark never sees a frame of the other.
 *
 * useStorage keeps plain strings unquoted, but a value written by an older
 * build may still carry quotes, hence the strip.
 */
export const RESTORE_SCRIPT = `
try{
var d=document.documentElement,q=function(k){var v=localStorage.getItem(k);return v?v.replace(/^"|"$/g,''):''};
var s=q(${JSON.stringify(STYLE_KEY)});if(s==='sans'||s==='serif')d.dataset.style=s;
var c=q(${JSON.stringify(COLOR_KEY)});
if(c==='dark'||(c!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))d.classList.add('dark');
}catch(e){}`
