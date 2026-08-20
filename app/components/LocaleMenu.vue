<script setup lang="ts">
import { localeName, type Locale } from '~/locales/index.ts'

const { t } = useT()
const { locale, choose, locales } = useLocaleChoice()

/**
 * The trigger stays deliberately short in every language. Full language names
 * belong in the menu, while the nav only needs to show the current choice.
 */
const shortName: Record<Locale, string> = {
  'zh-CN': '简中',
  'zh-TW': '台灣',
  'zh-HK': '香港',
  'ja-JP': '日本',
  'ko-KR': '한국',
}
const languages = locales.map((code) => ({
  code,
  label: localeName(code),
}))

const open = ref(false)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()

onClickOutside(root, () => (open.value = false))
onKeyStroke('Escape', () => {
  if (!open.value) return
  open.value = false
  nextTick(() => trigger.value?.focus())
})

async function select(code: Locale) {
  open.value = false
  await choose(code)
  nextTick(() => trigger.value?.focus())
}
</script>

<template>
  <div ref="root" class="relative">
    <button
      ref="trigger"
      type="button"
      class="h-8 inline-flex items-center gap-1 rounded-md px-1.5 text-mute transition-colors duration-150 hover:bg-sunk hover:text-ink focus-ring"
      :title="`${t('options.language')}：${localeName(locale)}`"
      :aria-label="`${t('options.language')}：${localeName(locale)}`"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="i-ri-translate-2 block text-sm" aria-hidden="true" />
      <span class="whitespace-nowrap text-xs text-soft">{{
        shortName[locale]
      }}</span>
      <span
        class="i-ri-arrow-down-s-line hidden text-xs transition-transform duration-150 sm:block"
        :class="open ? 'rotate-180' : ''"
        aria-hidden="true"
      />
    </button>

    <Transition name="locale-pop">
      <div
        v-if="open"
        role="menu"
        class="absolute right-0 top-full z-30 mt-2 w-44 border border-rule rounded-lg bg-paper p-1.5 text-ink shadow-black/5 shadow-lg"
      >
        <button
          v-for="language in languages"
          :key="language.code"
          type="button"
          role="menuitemradio"
          :aria-checked="locale === language.code"
          class="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-150 hover:bg-sunk focus-ring"
          :class="locale === language.code ? 'text-ink' : 'text-soft'"
          @click="select(language.code)"
        >
          <span class="min-w-0 flex-1">{{ language.label }}</span>
          <span
            v-if="locale === language.code"
            class="i-ri-check-line block shrink-0 text-$c-g2"
            aria-hidden="true"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.locale-pop-enter-active,
.locale-pop-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}
.locale-pop-enter-from,
.locale-pop-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}
</style>
