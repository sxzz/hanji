<script setup lang="ts">
import { useStyle } from '~/composables/style.ts'
import { revealRestoredPreferences } from '~/utils/preference-restore.ts'
import type { NuxtError } from '#app'

const serifStylesheetUrl = '/fonts/fonts-serif.css'

const props = defineProps<{
  error: NuxtError
}>()

const { t, meta } = useT()
const style = useStyle()
const statusCode = computed(() =>
  Number(props.error.status || props.error.statusCode || 500),
)
const isNotFound = computed(() => statusCode.value === 404)
const title = computed(() =>
  t(isNotFound.value ? 'error.notFoundTitle' : 'error.genericTitle'),
)
const description = computed(() =>
  t(
    isNotFound.value ? 'error.notFoundDescription' : 'error.genericDescription',
  ),
)
const pageTitle = computed(
  () => `${statusCode.value} · ${title.value} · ${t('meta.title')}`,
)

// app.vue is not mounted while Nuxt renders error.vue. Finish the same locale
// restoration here so a saved language never waits for the four-second
// emergency timeout before the error page becomes visible.
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

const serifWanted = ref(false)
watchEffect(() => {
  if (style.value === 'serif') serifWanted.value = true
})

useHead({
  htmlAttrs: {
    lang: () => meta.value.htmlLang,
    'data-style': () => style.value,
  },
  title: pageTitle,
  meta: [
    { name: 'apple-mobile-web-app-title', content: () => t('meta.title') },
  ],
  link: () =>
    serifWanted.value ? [{ rel: 'stylesheet', href: serifStylesheetUrl }] : [],
})

useSeoMeta({
  applicationName: () => t('meta.title'),
  description,
  ogTitle: pageTitle,
  ogDescription: description,
  ogLocale: () => meta.value.htmlLang.replace('-', '_'),
  ogSiteName: () => t('meta.title'),
  ogType: 'website',
  twitterCard: 'summary',
  twitterTitle: pageTitle,
  twitterDescription: description,
})

function goBack(): void {
  if (!import.meta.client) return
  if (window.history.length > 1) window.history.back()
  else window.location.assign('/')
}

function reload(): void {
  if (import.meta.client) window.location.reload()
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-paper">
    <!--
      THESIS: A missing page is a lost proof sheet, not a framework failure.
      OWN-WORLD: Warm paper, cool ink, hairline guides, and one misregistered Han glyph.
      STORY: Name the problem plainly, reassure the reader, and offer an immediate way back.
      FIRST VIEWPORT: A compact preference bar sits above a split specimen-and-copy composition; recovery actions follow the explanation.
      FORM: EXISTING-PROOF-SHEET — the established world extended as a focused error state, with no new visual system introduced.
      FINISH: Reviewed at desktop, mobile, and the reported viewport; no new image assets or durable system changes ship here.
    -->
    <header class="bg-paper">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="h-[var(--nav-h)] flex items-center">
          <a href="/" class="focus-ring mr-auto flex shrink-0 items-center">
            <HanjiLogo />
          </a>

          <nav
            class="flex items-center gap-1 text-sm text-mute"
            :aria-label="t('nav.options')"
          >
            <StyleToggle />
            <LocaleMenu />
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>

    <main
      class="mx-auto max-w-6xl w-full flex flex-1 items-center px-4 py-10 sm:px-6 sm:py-14"
    >
      <section
        class="grid w-full items-center gap-10 md:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1fr)] lg:gap-24 md:gap-16"
        aria-labelledby="error-title"
      >
        <div class="error-proof mx-auto max-w-80 w-full" aria-hidden="true">
          <span class="error-axis error-axis-x" />
          <span class="error-axis error-axis-y" />

          <div class="error-glyph overprint hanji-cn">
            <span
              class="overprint-layer baseline"
              style="--i: 0; --n: 3; --layer-color: var(--c-ink)"
              >失</span
            >
            <span
              class="overprint-layer"
              style="--i: 1; --n: 3; --layer-color: var(--c-g1)"
              >失</span
            >
            <span
              class="overprint-layer"
              style="--i: 2; --n: 3; --layer-color: var(--c-g2)"
              >失</span
            >
          </div>

          <span class="error-code tabular font-mono">{{ statusCode }}</span>
        </div>

        <div class="max-w-xl md:py-6">
          <h1
            id="error-title"
            class="text-balance text-3xl font-normal leading-tight sm:text-4xl"
          >
            {{ title }}
          </h1>
          <p class="mt-5 max-w-[34rem] text-base text-soft leading-relaxed">
            {{ description }}
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <a
              v-if="isNotFound"
              href="/"
              class="focus-ring h-10 inline-flex items-center gap-2 rounded-md bg-ink px-4 text-sm text-paper transition-opacity duration-150 hover:opacity-85"
            >
              <span class="i-ri-arrow-left-line" aria-hidden="true" />
              {{ t('error.home') }}
            </a>
            <button
              v-else
              type="button"
              class="focus-ring h-10 inline-flex items-center gap-2 rounded-md bg-ink px-4 text-sm text-paper transition-opacity duration-150 hover:opacity-85"
              @click="reload"
            >
              <span class="i-ri-refresh-line" aria-hidden="true" />
              {{ t('error.reload') }}
            </button>

            <button
              v-if="isNotFound"
              type="button"
              class="focus-ring h-10 inline-flex items-center gap-2 btn-ghost px-4 text-sm"
              @click="goBack"
            >
              {{ t('error.back') }}
            </button>
            <a
              v-else
              href="/"
              class="focus-ring h-10 inline-flex items-center gap-2 btn-ghost px-4 text-sm"
            >
              {{ t('error.home') }}
            </a>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.error-proof {
  position: relative;
  display: grid;
  aspect-ratio: 1;
  place-items: center;
  border-block: 1px solid var(--c-rule);
}

.error-axis {
  position: absolute;
  display: block;
  background: var(--c-rule);
}

.error-axis-x {
  right: 0;
  left: 0;
  top: 50%;
  height: 1px;
}

.error-axis-y {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
}

.error-glyph {
  --fan-step: 3px;

  width: 11rem;
  height: 11rem;
  font-size: 11rem;
  line-height: 1;
}

.error-glyph .overprint-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-code {
  position: absolute;
  right: 0;
  bottom: 0.75rem;
  padding-left: 0.5rem;
  color: var(--c-ink-mute);
  background: var(--c-paper);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}
</style>
