import { readFileSync } from 'node:fs'
import type { CharsData } from './shared/types.ts'

/**
 * Character pages worth prerendering: those a reader is most likely to land on
 * from a search. Rendering all 8,000 would put hundreds of MB of near-identical
 * HTML in the output for no gain; the rest are served by the SPA fallback.
 */
const chars: CharsData = JSON.parse(
  readFileSync(new URL('public/data/chars.json', import.meta.url), 'utf8'),
)
const PRERENDERED_KEYS = new Set(
  chars.rows.filter((row) => row.common === 4).map((row) => row.key),
)
const KEYS = new Set(chars.rows.map((row) => row.key))

/**
 * The regional forms redirect to the row they belong to (/char/国 ->
 * /char/國). An alias is prerendered when its target is, so a crawler that
 * finds one of these addresses gets the redirect from the host rather than
 * having to run the app to be told.
 */
const ALIASES = new Map<string, string>()
for (const row of chars.rows)
  for (const char of [...row.chars, row.old?.char ?? '', ...(row.aka ?? [])])
    if (char && !KEYS.has(char) && !ALIASES.has(char))
      ALIASES.set(char, row.key)

const path = (key: string) => `/char/${encodeURIComponent(key)}`
const PRERENDERED_CHARS = [
  ...[...PRERENDERED_KEYS].map(path),
  ...[...ALIASES]
    .filter(([, target]) => PRERENDERED_KEYS.has(target))
    .map(([alias]) => path(alias)),
]

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@unocss/nuxt', '@vueuse/nuxt'],

  vue: {
    optionsApi: false,
  },

  experimental: {
    // Route changes run through startViewTransition where it exists; browsers
    // without it navigate normally, with no animation and no error.
    viewTransition: true,
  },

  // Fully static. The language never enters the URL, so routes do not fan out
  // per locale -- these are all of them.
  nitro: {
    prerender: {
      // Crawling would walk every character linked from the first page; the
      // route list below is the deliberate one.
      crawlLinks: false,
      routes: ['/', '/about', ...PRERENDERED_CHARS],
    },
  },

  css: [
    '@unocss/reset/tailwind.css',
    '~/styles/vars.css',
    '~/styles/global.css',
  ],

  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN', 'data-style': 'sans' },
      // Chunked Han subsets. Keeping the @font-face rules in their own
      // cacheable files keeps them out of the JS/CSS bundle; serif is linked
      // on demand from app.vue.
      link: [
        { rel: 'stylesheet', href: '/fonts/fonts-ui.css' },
        { rel: 'stylesheet', href: '/fonts/fonts-sans.css' },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            '同一个汉字，中国大陆、香港、台湾、日本四地写法常常不同。这里把有差异的字全部列出来，可按笔画、常用度排序，按差异模式筛选。',
        },
      ],
    },
  },

  devtools: { enabled: false },
  compatibilityDate: 'latest',
})
