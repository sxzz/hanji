import { readFileSync } from 'node:fs'
import { RESTORE_SCRIPT } from './app/utils/theme.ts'
import { PREFERENCE_RESTORE_SCRIPT } from './scripts/preference-restore.ts'
import type { CharsData } from './shared/types.ts'
import type { NuxtConfig } from 'nuxt/schema'

/**
 * Every canonical row has a real static detail page. Aliases deliberately use
 * the SPA fallback and redirect in char-alias middleware instead: emitting a
 * tiny file for each alias would consume thousands of the host's file quota.
 */
const chars: CharsData = JSON.parse(
  readFileSync(new URL('public/data/chars.json', import.meta.url), 'utf8'),
)

const path = (key: string) => `/char/${encodeURIComponent(key)}`
const PRERENDERED_CHARS = chars.rows.map((row) => path(row.key))

// https://nuxt.com/docs/api/configuration/nuxt-config
export default {
  modules: ['@unocss/nuxt', '@vueuse/nuxt'],

  vue: {
    optionsApi: false,
  },

  experimental: {
    // Page data is bundled locally rather than loaded with useAsyncData, so
    // the extracted payload for every route is just an empty 69-byte file.
    // Keep hydration state inline and avoid spending one host file per page.
    payloadExtraction: false,
    // Install Nuxt's View Transition integration. app.viewTransition below
    // leaves it off until the global route middleware opts in per navigation.
    viewTransition: true,
  },

  // Fully static. The language never enters the URL, so routes do not fan out
  // per locale -- these are all of them.
  nitro: {
    prerender: {
      // Crawling would walk every character linked from the first page; the
      // route list below is the deliberate one.
      crawlLinks: false,
      // Cloudflare serves /char/學 directly from char/學.html. Directory
      // indexes would first redirect the non-ASCII URL to /char/學/, and the
      // client-facing routes deliberately have no trailing slash.
      autoSubfolderIndex: false,
      routes: ['/', '/about', ...PRERENDERED_CHARS],
    },
  },

  css: [
    '@unocss/reset/tailwind.css',
    '~/styles/vars.css',
    '~/styles/global.css',
    '~/styles/overprint.css',
  ],

  app: {
    // Only home <-> character detail opts in; every other route change is
    // deliberately immediate.
    viewTransition: false,
    head: {
      htmlAttrs: { lang: 'zh-CN', 'data-style': 'sans' },
      // app.vue does not render into Nitro's client-only fallback documents.
      // Keep both bootstraps static so 200.html and 404.html also restore the
      // theme and suppress a mismatching preference frame before first paint.
      script: [
        { innerHTML: RESTORE_SCRIPT, tagPosition: 'head' },
        { innerHTML: PREFERENCE_RESTORE_SCRIPT, tagPosition: 'head' },
      ],
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
            '同一个汉字，中国大陆、香港、台湾、日本、韩国五地写法常常不同。这里把五地常用字并排列出，可按笔画、常用度排序，按差异模式筛选。',
        },
      ],
    },
  },

  devtools: { enabled: false },
  compatibilityDate: 'latest',
} satisfies NuxtConfig
