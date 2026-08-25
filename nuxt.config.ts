import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { LOCALES, messages } from './app/locales/all.ts'
import {
  PWA_INSTALL_CAPTURE_SCRIPT,
  PWA_INSTALL_DISMISSED_KEY,
} from './app/utils/pwa-install.ts'
import { RESTORE_SCRIPT } from './app/utils/theme.ts'
import { PREFERENCE_RESTORE_SCRIPT } from './scripts/preference-restore.ts'
import {
  BRAND_DESCRIPTION,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
} from './shared/brand.ts'
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
const fontStylesheetPaths = [
  'fonts-critical.css',
  'fonts-ui.css',
  'fonts-sans.css',
  'fonts-serif.css',
].map((name) => path.resolve(import.meta.dirname, 'public/fonts', name))

function assertGeneratedAssets(): void {
  if (
    !existsSync(charsPath) ||
    fontStylesheetPaths.some((fontPath) => !existsSync(fontPath))
  )
    throw new Error(
      'Missing generated character data or fonts; run pnpm build:data first.',
    )
}

const publicCharsPath = path.resolve(
  import.meta.dirname,
  '.output/public/data/chars.json',
)

const CHARS_SOURCE = existsSync(charsPath) ? readFileSync(charsPath) : null
const CHARS_DATA = CHARS_SOURCE
  ? (JSON.parse(CHARS_SOURCE.toString()) as CharsData)
  : null
const CHAR_KEYS = CHARS_DATA?.rows.map((row) => row.key) ?? []
const DATASET_STATS = {
  rows: CHARS_DATA?.stats.rows ?? 0,
  identical: CHARS_DATA?.stats.identical ?? 0,
  allDiffer: CHARS_DATA?.stats.allDiffer ?? 0,
}
const CHARS_REVISION = CHARS_SOURCE
  ? createHash('sha256').update(CHARS_SOURCE).digest('hex')
  : 'missing'
const PRERENDERED_CHARS = CHAR_KEYS.map(charPath)
const PRERENDER_ROUTES = ['/', '/about', ...PRERENDERED_CHARS]
const SITEMAP_ROUTES = [
  '/',
  '/about',
  ...CHAR_KEYS.map((key) => `/char/${key}`),
]
const SITE_URL = process.env.NUXT_SITE_URL || 'https://hanji.sxzz.moe'
const PWA_DEV = process.env.NUXT_PWA_DEV === '1'

// Chrome and Edge 148+ choose these values from the browser's language
// preferences. The default remains Simplified Chinese for older browsers.
const PWA_LOCALIZED_MANIFEST = {
  name_localized: Object.fromEntries(
    LOCALES.map((locale) => [locale, messages[locale].meta.title]),
  ),
  short_name_localized: Object.fromEntries(
    LOCALES.map((locale) => [locale, messages[locale].meta.title]),
  ),
  description_localized: Object.fromEntries(
    LOCALES.map((locale) => [locale, messages[locale].meta.description]),
  ),
}

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

// https://nuxt.com/docs/api/configuration/nuxt-config
export default {
  hooks: {
    // Nuxt's prepare mode only writes types; it neither prerenders nor bundles
    // the app and can safely use an empty route list. Commands that build or
    // serve the app must still have the complete ignored generated assets.
    ready: (nuxt) => {
      if (!nuxt.options._prepare) assertGeneratedAssets()
    },

    // Nuxt turns every manifest dynamic import into an eager <link
    // rel="prefetch">. The 32 stroke-shard loaders are only useful after a
    // character's stroke panel enters the viewport, so keep the imports
    // themselves but let the browser fetch them on demand.
    'build:manifest': (manifest) => {
      for (const chunk of Object.values(manifest) as Array<{
        dynamicImports?: string[]
      }>)
        chunk.dynamicImports = []
    },

    // vite-plugin-pwa appends the manifest to its mutable additional-entry
    // array. Nuxt can regenerate the worker more than once in a static build,
    // so make that hook idempotent before Workbox receives the final list.
    'pwa:beforeBuildServiceWorker': (options) => {
      // @vite-pwa/nuxt replaces a null fallback with `/` in development.
      // An empty string survives that normalization; turn it back into null
      // before Workbox validates the final configuration.
      if (PWA_DEV && options.workbox.navigateFallback === '')
        options.workbox.navigateFallback = null

      const seen = new Set<string>()
      options.workbox.additionalManifestEntries =
        options.workbox.additionalManifestEntries?.filter((entry) => {
          const url = typeof entry === 'string' ? entry : entry.url
          if (seen.has(url)) return false

          seen.add(url)
          return true
        })
    },
  },

  modules: [
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    '@unocss/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
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
    datasetStats: DATASET_STATS,
  },

  pwa: {
    registerType: 'autoUpdate',
    manifestFilename: 'manifest.webmanifest',
    devOptions: {
      enabled: PWA_DEV,
      // The development worker exists only for installability testing. It
      // stays network-only below so it cannot cache Vite's HMR responses.
      suppressWarnings: true,
    },
    // These assets are included by the final Workbox scan below. Turning off
    // Vite's earlier injection avoids duplicate entries when Nuxt regenerates
    // the service worker after prerendering.
    includeManifestIcons: false,
    client: {
      installPrompt: PWA_INSTALL_DISMISSED_KEY,
      periodicSyncForUpdates: 60 * 60,
    },
    manifest: {
      ...PWA_LOCALIZED_MANIFEST,
      id: '/',
      name: messages['zh-CN'].meta.title,
      short_name: messages['zh-CN'].meta.title,
      description: BRAND_DESCRIPTION,
      lang: 'zh-CN',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'any',
      background_color: '#fbfaf7',
      theme_color: '#fbfaf7',
      icons: [
        {
          src: '/pwa/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa/maskable-icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      screenshots: [
        {
          src: '/pwa/screenshot-wide.png',
          sizes: '1280x720',
          type: 'image/png',
          form_factor: 'wide',
          label: '汉智桌面端字形对照界面',
        },
        {
          src: '/pwa/screenshot-narrow.png',
          sizes: '390x844',
          type: 'image/png',
          form_factor: 'narrow',
          label: '汉智移动端字形对照界面',
        },
      ],
    },
    workbox: {
      cacheId: 'hanji',
      cleanupOutdatedCaches: true,
      disableDevLogs: true,
      globPatterns: [
        '_nuxt/**/*',
        '200.html',
        'favicon.svg',
        'favicon-32x32.png',
        'favicon.ico',
        'logo.svg',
        'logo-seal.svg',
        'pwa/*.png',
        'notices/**/*',
      ],
      // Nuxt normally rewrites every precached HTML filename to its route.
      // Keep the client-only fallback as a real file so Workbox can serve it
      // for an offline character URL that was never visited before. The
      // transform also removes duplicate assets collected from public/ and
      // the generated web manifest.
      manifestTransforms: [
        (entries) => {
          const seen = new Set<string>()

          return {
            manifest: entries.filter((entry) => {
              if (entry.url === '200.html') entry.url = '/200.html'
              if (seen.has(entry.url)) return false

              seen.add(entry.url)
              return true
            }),
          }
        },
      ],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      navigationPreload: !PWA_DEV,
      // The module defaults this to `/`, which would register a precached
      // route before the Network First handler below and bypass the network.
      navigateFallback: PWA_DEV ? '' : null,
      additionalManifestEntries: [
        { url: '/data/chars.json', revision: CHARS_REVISION },
      ],
      runtimeCaching: PWA_DEV
        ? [
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkOnly',
            },
          ]
        : [
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'hanji-pages',
                networkTimeoutSeconds: 3,
                cacheableResponse: { statuses: [0, 200] },
                expiration: {
                  maxEntries: 64,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                  purgeOnQuotaError: true,
                },
                precacheFallback: { fallbackURL: '/200.html' },
              },
            },
          ],
    },
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
    // The shared character dataset has its own cached URL rather than route
    // payloads, so extraction would emit one empty file for every character.
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
      // Keep the bootstraps static so 200.html and 404.html also restore the
      // theme and suppress a mismatching preference frame before first paint.
      script: [
        { innerHTML: RESTORE_SCRIPT, tagPosition: 'head' },
        { innerHTML: PREFERENCE_RESTORE_SCRIPT, tagPosition: 'head' },
        { innerHTML: PWA_INSTALL_CAPTURE_SCRIPT, tagPosition: 'head' },
        {
          'data-goatcounter': 'https://hanji.goatcounter.com/count',
          async: true,
          src: '//gc.zgo.at/count.js',
        },
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
          href: '/pwa/apple-touch-icon-180.png',
        },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        {
          name: 'theme-color',
          media: '(prefers-color-scheme: light)',
          content: THEME_COLOR_LIGHT,
        },
        {
          name: 'theme-color',
          media: '(prefers-color-scheme: dark)',
          content: THEME_COLOR_DARK,
        },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'application-name', content: '汉智' },
        { name: 'apple-mobile-web-app-title', content: '汉智' },
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
