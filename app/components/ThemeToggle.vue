<script setup lang="ts">
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from '~~/shared/brand.ts'
import { COLOR_KEY } from '~/utils/theme.ts'

const { t } = useT()

/**
 * useDark resolves the stored `auto` against the system preference itself, so
 * the toggle is a plain boolean and the "follow the system" case needs no
 * handling here. It writes the same three-valued key the inline restore
 * script reads.
 */
const isDark = useDark({ storageKey: COLOR_KEY })
const toggleDark = useToggle(isDark)

function toggleDarkClick() {
  if (!document.startViewTransition) {
    toggleDark()
    return
  }

  document.startViewTransition(() => {
    toggleDark()
  })
}

if (import.meta.client)
  watch(
    isDark,
    (dark) => {
      const color = dark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT
      for (const meta of document.querySelectorAll<HTMLMetaElement>(
        'meta[name="theme-color"]',
      ))
        meta.content = color
    },
    { immediate: true },
  )
</script>

<template>
  <!--
    Both icons are rendered and CSS picks one from the root `dark` class, which
    an inline script sets before first paint. A class binding would be resolved
    at prerender time and hydration does not rewrite it, so the button would
    show the wrong icon to anyone returning in dark mode.
  -->
  <button
    type="button"
    class="focus-ring icon-btn"
    :title="t('nav.theme')"
    :aria-label="t('nav.theme')"
    @click="toggleDarkClick()"
  >
    <span class="i-ri-moon-line theme-icon theme-icon-light" />
    <span class="i-ri-sun-line theme-icon theme-icon-dark" />
  </button>
</template>
