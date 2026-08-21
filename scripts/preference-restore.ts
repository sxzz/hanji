import { DEFAULT_LOCALE, LOCALES } from '../app/locales/index.ts'
import {
  FLAGS_KEY,
  HIDDEN_KEY,
  LOCALE_KEY,
  OUTLINE_KEY,
  RESTORING_ATTRIBUTE,
  VISIBILITY_VERSION_KEY,
} from '../app/utils/preference-restore.ts'
import { COLUMNS, DEFAULT_HIDDEN_COLUMNS, REGIONS } from '../shared/types.ts'

const RESTORE_TIMEOUT_MS = 4000

/**
 * Runs in the static head before first paint. It does not try to reproduce the
 * personalised page -- translations and column projection still belong to
 * Vue -- but it can tell when the SSG defaults would be visibly wrong.
 *
 * In that case CSS keeps the default page out of sight until the client has
 * restored every preference. Browsers with JavaScript disabled never execute
 * this script and therefore keep the complete, default-locale SSG page. The
 * timeout is for the rarer middle case where this inline script runs but the
 * application bundle or a locale chunk fails to load.
 */
export const PREFERENCE_RESTORE_SCRIPT = `
try{
var d=document.documentElement,o=d.lang,g=function(k){var v=localStorage.getItem(k);return v===null?'':v.replace(/^"|"$/g,'')};
var a=${JSON.stringify(LOCALES)},l=g(${JSON.stringify(LOCALE_KEY)}),w='';
if(a.indexOf(l)>=0)w=l;else{var n=navigator.languages||[navigator.language||''];for(var i=0;i<n.length;i++){var x=String(n[i]).toLowerCase(),b=x.split('-'),z=b[0];if(z==='ja'){w='ja-JP';break}if(z==='ko'){w='ko-KR';break}if(z==='zh'){w=b.indexOf('hk')>=0||b.indexOf('mo')>=0?'zh-HK':b.indexOf('tw')>=0||b.indexOf('hant')>=0?'zh-TW':'zh-CN';break}}}
var p=!!w&&w!==${JSON.stringify(DEFAULT_LOCALE)};
if(g(${JSON.stringify(FLAGS_KEY)})==='true'||g(${JSON.stringify(OUTLINE_KEY)})==='true')p=true;
var h,r=localStorage.getItem(${JSON.stringify(HIDDEN_KEY)});try{h=r===null?${JSON.stringify(DEFAULT_HIDDEN_COLUMNS)}:JSON.parse(r)}catch(e){h=${JSON.stringify(DEFAULT_HIDDEN_COLUMNS)}}if(!Array.isArray(h))h=${JSON.stringify(DEFAULT_HIDDEN_COLUMNS)};
var v=g(${JSON.stringify(VISIBILITY_VERSION_KEY)})==='true',c=${JSON.stringify(COLUMNS)};h=c.filter(function(k){return !v&&k==='kr'||h.indexOf(k)>=0});
if(${JSON.stringify(REGIONS)}.every(function(k){return h.indexOf(k)>=0}))h=${JSON.stringify(DEFAULT_HIDDEN_COLUMNS)};
if(h.length!==${DEFAULT_HIDDEN_COLUMNS.length}||h.some(function(k,i){return k!==${JSON.stringify(DEFAULT_HIDDEN_COLUMNS)}[i]}))p=true;
if(p){if(w)d.lang=w;d.setAttribute(${JSON.stringify(RESTORING_ATTRIBUTE)},'');setTimeout(function(){if(d.hasAttribute(${JSON.stringify(RESTORING_ATTRIBUTE)})){d.lang=o;d.removeAttribute(${JSON.stringify(RESTORING_ATTRIBUTE)})}},${RESTORE_TIMEOUT_MS})}
}catch(e){}`
