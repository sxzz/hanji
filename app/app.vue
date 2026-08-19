<script setup lang="ts">
import { RESTORE_SCRIPT, useStyle } from '~/composables/style.ts'

const { t, meta } = useT()
const style = useStyle()

// Picks the reader's language once the client is running; the prerendered
// HTML is always the default locale
useLocaleChoice()

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
  script: [{ innerHTML: RESTORE_SCRIPT, tagPosition: 'head' }],
  titleTemplate: (title) =>
    title ? `${title} \u00B7 ${t('meta.title')}` : t('meta.title'),
  link: () =>
    serifWanted.value
      ? [{ rel: 'stylesheet', href: '/fonts/fonts-serif.css' }]
      : [],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
