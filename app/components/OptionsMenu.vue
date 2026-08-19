<script setup lang="ts">
import { localeName, type Locale } from '~/locales/index.ts'
const { t } = useT()
const {
  emojiFlags,
  outline,
  regionLabel,
  labelClass,
  COLUMNS,
  columnShown,
  columnLocked,
  toggleColumn,
} = usePrefs()
const { locale, choose, locales } = useLocaleChoice()
const languages = locales.map((code) => ({ code, label: localeName(code) }))

/** Reader preferences, each labeled by `options.<key>` and `<key>Hint`. */
const options = [
  { key: 'emoji', model: emojiFlags },
  { key: 'outline', model: outline },
]

const open = ref(false)
const root = ref<HTMLElement>()
onClickOutside(root, () => (open.value = false))
onKeyStroke('Escape', () => (open.value = false))
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="rounded-md p-1.5 text-mute transition-colors duration-150 hover:text-ink focus-ring"
      :title="t('nav.options')"
      :aria-label="t('nav.options')"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="i-ri-settings-3-line block" />
    </button>

    <Transition name="pop">
      <div
        v-if="open"
        class="absolute right-0 top-full z-20 mt-2 w-64 border border-rule rounded-lg bg-paper p-3 text-ink shadow-black/5 shadow-lg"
      >
        <h2 class="mb-2 eyebrow">{{ t('options.title') }}</h2>
        <label class="mb-3 block">
          <span class="mb-1 block text-sm text-ink font-medium">{{
            t('options.language')
          }}</span>
          <select
            :value="locale"
            class="w-full border border-rule rounded-md bg-paper px-2 py-1.5 text-sm text-ink focus-ring"
            @change="
              choose(($event.target as HTMLSelectElement).value as Locale)
            "
          >
            <option
              v-for="language in languages"
              :key="language.code"
              :value="language.code"
            >
              {{ language.label }}
            </option>
          </select>
        </label>
        <label
          v-for="option in options"
          :key="option.key"
          class="flex cursor-pointer items-start gap-2.5 not-last:mb-3"
        >
          <input
            v-model="option.model.value"
            type="checkbox"
            class="mt-0.5 size-4 shrink-0 accent-$c-g2 focus-ring"
          />
          <span>
            <!-- The panel hangs inside a muted nav, so the label has to
                 reclaim ink color or it inherits the nav's gray -->
            <span class="text-sm text-ink font-medium">{{
              t(`options.${option.key}`)
            }}</span>
            <span class="mt-1 block text-xs text-soft">{{
              t(`options.${option.key}Hint`)
            }}</span>
          </span>
        </label>

        <!--
          Which columns are compared at all. Same chip as the filter bar, but
          not the same state: down there the exceptional thing is a filter being
          on, so selection is a filled slab. Here every column starts on, so the
          exceptional thing is one being off -- and a chip that is off simply
          fades. That also keeps a solid ink field from ever landing behind a
          flag, where the emoji's own colors fight it.
        -->
        <div class="mt-3 border-t border-rule pt-3">
          <span class="text-sm text-ink font-medium">{{
            t('options.columns')
          }}</span>
          <span class="mt-1 block text-xs text-soft">{{
            t('options.columnsHint')
          }}</span>
          <div class="mt-2 flex flex-wrap justify-center gap-1.5">
            <button
              v-for="column in COLUMNS"
              :key="column"
              type="button"
              class="h-7 flex items-center gap-1.5 border rounded-md px-2 text-xs transition duration-150 disabled:cursor-not-allowed focus-ring"
              :class="
                columnShown(column)
                  ? 'border-ink/35 bg-paper text-ink'
                  : 'border-rule bg-sunk text-mute opacity-55 hover:opacity-85'
              "
              :disabled="columnLocked(column)"
              :title="
                columnLocked(column)
                  ? t('options.columnsLast')
                  : t(`region.${column}.full`)
              "
              :aria-pressed="columnShown(column)"
              @click="toggleColumn(column)"
            >
              <span :class="labelClass">{{
                regionLabel(column === 'old' ? 'jp' : column)
              }}</span>
              <span v-if="column === 'old'">{{ t('region.old.short') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
