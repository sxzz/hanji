<script setup lang="ts">
import { useStyle } from '~/composables/style.ts'
import { revealRestoredPreferences } from '~/utils/preference-restore.ts'

const { t, meta } = useT()
const route = useRoute()
const style = useStyle()

const isHome = computed(() => route.name === 'index')
const showFooter = computed(() => route.name !== 'about')
const baseFontStylesheets = [
  '/fonts/fonts-ui.css',
  '/fonts/fonts-sans.css',
] as const
const criticalFontStylesheet = '/fonts/fonts-critical.css'
const serifStylesheetUrl = '/fonts/fonts-serif.css'
const homeFontPreloads = [
  '/fonts/ui-latin-sans.woff2',
  '/fonts/ui-sans-zh-CN-0.woff2',
  '/fonts/ui-sans-zh-CN-1.woff2',
  '/fonts/hanji-sans-cn-0.woff2',
  '/fonts/hanji-sans-hk-0.woff2',
  '/fonts/hanji-sans-tw-0.woff2',
  '/fonts/hanji-sans-jp-0.woff2',
] as const

// Picks the reader's language once the client is running; the prerendered
// HTML is always the default locale. If the head script hid a mismatching
// default frame, reveal only after the translated and projected DOM is ready.
const { ready: localeReady } = useLocaleChoice()
if (import.meta.client) {
  watch(
    localeReady,
    async (ready) => {
      if (!ready) return
      await nextTick()
      revealRestoredPreferences(meta.value.htmlLang)
    },
    { flush: 'post' },
  )
}

/**
 * Serif ships its own ~140KB of @font-face rules. Latch it once a reader asks
 * for serif and keep it: unlinking the stylesheet would leave the page without
 * the faces it is already using.
 */
const serifWanted = ref(false)
watchEffect(() => {
  if (style.value === 'serif') serifWanted.value = true
})

useHead({
  htmlAttrs: {
    lang: () => meta.value.htmlLang,
    'data-style': () => style.value,
  },
  titleTemplate: (title) =>
    title
      ? `${title} \u00B7 ${t('meta.title')}`
      : `${t('meta.title')} ${t('meta.name')} \u00B7 ${t('meta.slogan')}`,
  // Font-face declarations do not style the fallback frame themselves. Fetch
  // later unicode ranges at high priority without making their CSS block the
  // first paint; each preload becomes a stylesheet as soon as it arrives. A
  // small critical sheet discovers the initial fonts before the first paint.
  link: () => [
    { rel: 'stylesheet' as const, href: criticalFontStylesheet },
    ...(isHome.value
      ? homeFontPreloads.map((href) => ({
          rel: 'preload' as const,
          as: 'font' as const,
          type: 'font/woff2',
          crossorigin: 'anonymous' as const,
          fetchpriority: 'high' as const,
          href,
        }))
      : []),
    ...baseFontStylesheets.map((href) => ({
      rel: 'preload' as const,
      as: 'style' as const,
      href,
      onload: "this.onload=null;this.rel='stylesheet'",
    })),
    ...(serifWanted.value
      ? [{ rel: 'stylesheet' as const, href: serifStylesheetUrl }]
      : []),
  ],
  noscript: [
    {
      innerHTML: baseFontStylesheets
        .map((href) => `<link rel="stylesheet" href="${href}">`)
        .join(''),
    },
  ],
  meta: () => [
    { name: 'application-name', content: t('meta.title') },
    { name: 'apple-mobile-web-app-title', content: t('meta.title') },
  ],
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />

    <div class="mx-auto max-w-6xl w-full flex flex-1 flex-col px-4 sm:px-6">
      <main class="flex-1">
        <NuxtPage />
      </main>

      <footer
        v-if="showFooter"
        class="mt-16 border-t border-rule"
        :class="isHome ? 'py-8' : 'py-6'"
      >
        <template v-if="isHome">
          <h2 class="mb-3 eyebrow">{{ t('footer.sources') }}</h2>
          <DataSources />
        </template>
        <p class="text-xs text-mute" :class="{ 'mt-4': isHome }">
          <NuxtLink to="/about" class="focus-ring rule-link">
            {{ t('footer.detail') }}
          </NuxtLink>
        </p>
      </footer>
    </div>
  </div>
</template>
