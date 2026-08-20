export const STYLE_KEY = 'hanji:style'
export const COLOR_KEY = 'hanji:color'

/**
 * Runs in <head> before anything is painted, so a reader who chose serif or
 * dark never sees a frame of the other.
 *
 * This is installed through nuxt.config rather than app.vue so it is also
 * present in the client-only 200.html and 404.html fallback shells.
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
