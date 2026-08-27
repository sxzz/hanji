import type { GoatCounterEventParams } from 'goat-counter'

export const GOATCOUNTER_EVENTS = {
  logoCopy: ['logo-copy', { title: 'Logo copied' }],
  logoDownload: ['logo-download', { title: 'Logo downloaded' }],
  pwaInstall: ['pwa-install', { title: 'PWA installed' }],
  searchResultOpen: ['search-result-open', { title: 'Search result opened' }],
  strokePlay: ['stroke-play', { title: 'Stroke order played' }],
} as const satisfies Record<
  string,
  readonly [name: string, params: GoatCounterEventParams]
>
