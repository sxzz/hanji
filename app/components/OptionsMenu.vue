<script setup lang="ts">
const { t } = useT()
const {
  flagLabels,
  flagsOn,
  outline,
  COLUMNS,
  columnShown,
  columnLocked,
  toggleColumn,
} = usePrefs()

/** Reader preferences, each labeled by `options.<key>` and `<key>Hint`. */
const options = [
  { key: 'flags', model: flagLabels },
  { key: 'outline', model: outline },
]

const open = ref(false)
const root = ref<HTMLElement>()
onClickOutside(root, () => (open.value = false))
onKeyStroke('Escape', () => (open.value = false))
</script>

<template>
  <div ref="root" class="static md:relative">
    <button
      type="button"
      class="focus-ring icon-btn"
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
        class="absolute left-0 right-0 top-full z-20 mt-1 w-auto border border-rule rounded-lg bg-paper p-3 text-ink shadow-black/5 shadow-lg md:left-auto md:right-0 md:mt-2 md:w-64"
      >
        <h2 class="mb-2 eyebrow">{{ t('options.title') }}</h2>
        <label
          v-for="option in options"
          :key="option.key"
          class="flex cursor-pointer items-start gap-2.5 not-last:mb-3"
        >
          <input
            v-model="option.model.value"
            type="checkbox"
            class="focus-ring mt-0.5 size-4 shrink-0 accent-$c-g2"
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
          on, so selection is a filled slab. Here an enabled column is the
          normal state, so a chip that is off simply fades. That also keeps a
          solid ink field from landing behind a flag, where the artwork's own
          colors fight it.

          One track per region, so the five sit as a single row of equal cells
          rather than wrapping and leaving the last one stranded. The kyujitai
          is not a place, and takes the full-width row underneath.
        -->
        <div class="mt-3 border-t border-rule pt-3">
          <span class="text-sm text-ink font-medium">{{
            t('options.columns')
          }}</span>
          <span class="mt-1 block text-xs text-soft">{{
            t('options.columnsHint')
          }}</span>
          <div class="grid grid-cols-5 mt-2 gap-1.5">
            <button
              v-for="column in COLUMNS"
              :key="column"
              type="button"
              class="focus-ring chip justify-center gap-1.5 text-xs disabled:cursor-not-allowed"
              :class="[
                columnShown(column)
                  ? 'border-ink/35 bg-paper text-ink'
                  : 'border-rule bg-sunk text-mute opacity-55 hover:opacity-85',
                column === 'old' ? 'order-1 col-span-5' : '',
              ]"
              :disabled="columnLocked(column)"
              :title="
                columnLocked(column)
                  ? t('options.columnsLast')
                  : t(`region.${column}.full`)
              "
              :aria-pressed="columnShown(column)"
              @click="toggleColumn(column)"
            >
              <RegionLabel
                :flag="flagsOn"
                :region="column === 'old' ? 'jp' : column"
              />
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
