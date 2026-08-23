import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { RESTORE_SCRIPT } from './app/utils/theme.ts'
import { PREFERENCE_RESTORE_SCRIPT } from './scripts/preference-restore.ts'
import { BRAND_DESCRIPTION } from './shared/brand.ts'
import type { CharsData } from './shared/types.ts'
import type { NuxtConfig } from 'nuxt/schema'

/**
 * Every canonical row has a real static detail page. Aliases deliberately use
 * the static 404 fallback and redirect after hydration instead: emitting a
 * tiny file for each alias would consume thousands of the host's file quota.
 */
const charPath = (key: string) => `/char/${encodeURIComponent(key)}`
const charsPath = path.resolve(
  import.meta.dirname,
  'app/assets/data/chars.json',
)

// A clean install runs `nuxt prepare` before the ignored dataset exists. Type
// preparation does not prerender or bundle the app, so it can safely use an
// empty route list. Every command that builds or serves the app still fails
// with a clear instruction until the real dataset has been generated.
if (
  !existsSync(charsPath) &&
  process.env.npm_lifecycle_event !== 'postinstall'
) {
  throw new Error(
    'Missing app/assets/data/chars.json; run pnpm build:data first.',
  )
}

const publicCharsPath = path.resolve(
  import.meta.dirname,
  '.output/public/data/chars.json',
)

const CHAR_KEYS = existsSync(charsPath)
  ? (JSON.parse(readFileSync(charsPath, 'utf8')) as CharsData).rows.map(
      (row) => row.key,
    )
  : []
const PRERENDERED_CHARS = CHAR_KEYS.map(charPath)
const PRERENDER_ROUTES = ['/', '/about', ...PRERENDERED_CHARS]
const SITEMAP_ROUTES = [
  '/',
  '/about',
  ...CHAR_KEYS.map((key) => `/char/${key}`),
]
const SITE_URL = process.env.NUXT_SITE_URL || 'https://hanji.sxzz.moe'

function resolveBuildSha(): string {
  const explicitSha = process.env.HANJI_BUILD_SHA?.trim()
  if (explicitSha && /^[\da-f]{40}$/i.test(explicitSha))
    return explicitSha.toLowerCase()

  try {
    const gitSha = execFileSync(
      'git',
      ['rev-parse', '--verify', 'HEAD^{commit}'],
      {
        cwd: import.meta.dirname,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim()
    return /^[\da-f]{40}$/i.test(gitSha) ? gitSha.toLowerCase() : ''
  } catch {
    // Source archives may not carry Git metadata. They still remain buildable.
    return ''
  }
}

const BUILD_INFO = {
  builtAt: new Date().toISOString(),
  sha: resolveBuildSha(),
}

// A clean install prepares Nuxt before generated fonts exist. Include the
// eager sans styles as soon as build:fonts has produced them; generate/dev
// still fail later on the explicit serif import if the build is incomplete.
const generatedFontStyles = ['fonts-ui.css', 'fonts-sans.css']
  .filter((file) =>
    existsSync(path.resolve(import.meta.dirname, 'app/assets/fonts', file)),
  )
  .map((file) => `~/assets/fonts/${file}`)

// https://nuxt.com/docs/api/configuration/nuxt-config
export default {
  modules: [
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    '@unocss/nuxt',
    '@vueuse/nuxt',
  ],

  site: {
    url: SITE_URL,
  },

  runtimeConfig: {
    public: {
      siteUrl: SITE_URL,
    },
  },

  appConfig: {
    buildInfo: BUILD_INFO,
  },

  sitemap: {
    // These are already the exact canonical routes emitted below. Supplying
    // them directly avoids treating the dynamic page pattern or fallbacks as
    // indexable pages, while the module owns encoding and XML generation.
    excludeAppSources: true,
    urls: SITEMAP_ROUTES,
    discoverImages: false,
    discoverVideos: false,
    xsl: false,
    zeroRuntime: true,
  },

  robots: {
    sitemap: '/sitemap.xml',
  },

  vue: {
    optionsApi: false,
  },

  // Keep build tooling inside Nuxt's generated Node project so the root
  // tsconfig reference checks scripts and config files without a parallel
  // hand-maintained tsconfig.
  typescript: {
    nodeTsConfig: {
      compilerOptions: {
        checkJs: true,
        types: ['node'],
      },
      include: ['../scripts/*.ts', '../*.config.*'],
    },
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
    hooks: {
      // The app consumes the Vite-managed source, while external users need a
      // stable URL. Add that byte-for-byte copy only to the finished output so
      // it never bypasses Vite inside the source tree.
      'prerender:done': async function () {
        await mkdir(path.dirname(publicCharsPath), { recursive: true })
        await copyFile(charsPath, publicCharsPath)
      },
    },
    prerender: {
      // Crawling would walk every character linked from the first page; the
      // route list below is the deliberate one.
      crawlLinks: false,
      // Cloudflare serves /char/學 directly from char/學.html. Directory
      // indexes would first redirect the non-ASCII URL to /char/學/, and the
      // client-facing routes deliberately have no trailing slash.
      autoSubfolderIndex: false,
      routes: PRERENDER_ROUTES,
    },
  },

  css: [
    '@unocss/reset/tailwind.css',
    ...generatedFontStyles,
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
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '32x32',
          href: '/favicon-32x32.png',
        },
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/apple-touch-icon.png',
        },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: BRAND_DESCRIPTION,
        },
      ],
    },
  },

  devtools: { enabled: false },
  compatibilityDate: 'latest',
} satisfies NuxtConfig
