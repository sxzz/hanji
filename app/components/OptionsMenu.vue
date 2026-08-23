<script setup lang="ts">
import { LOCALE_OLD_FORM_WIKIPEDIA } from '~/locales/index.ts'

const { t, locale } = useT()
const {
  flagLabels,
  outline,
  COLUMNS,
  columnShown,
  columnLocked,
  toggleColumn,
} = usePrefs()

const oldDescriptionId = useId()
const oldFormWikipedia = computed(() => LOCALE_OLD_FORM_WIKIPEDIA[locale.value])

/*
 * What the kyujitai column holds is worth a sentence, and a pointer can ask for
 * it by hovering. A touch screen has nothing to hover with, so the tap that
 * toggles the column opens the note as well, and a tap anywhere else in the
 * panel puts it away. Hover therefore drives this flag rather than a :hover
 * rule of its own -- a touch browser leaves :hover on whatever was tapped last,
 * which would strand the note open over the panel.
 */
const oldHelp = ref(false)

function toggleOldColumn() {
  toggleColumn('old')
  oldHelp.value = true
}

/** Reader preferences, each labeled by `options.<key>` and `<key>Hint`. */
const options = [
  { key: 'flags', model: flagLabels },
  { key: 'outline', model: outline },
]

const open = ref(false)
const root = ref<HTMLElement>()
onClickOutside(root, () => (open.value = false))
onKeyStroke('Escape', () => (open.value = false))
watch(open, (shown) => {
  if (!shown) oldHelp.value = false
})
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
        class="absolute left-0 right-0 top-full z-20 mt-1 w-auto border border-rule rounded-lg bg-paper p-3 text-ink shadow-black/5 shadow-lg md:left-auto md:right-0 md:mt-2 md:w-80"
        @pointerdown="oldHelp = false"
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

        <!-- One track per column, in the order the table itself draws them,
             kyujitai included: what the row switches off is exactly what stops
             appearing, in the same places. Every control shares RegionOption's
             edge-and-key selected state. -->
        <div class="mt-3 border-t border-rule pt-3">
          <span class="text-sm text-ink font-medium">{{
            t('options.columns')
          }}</span>
          <span class="mt-1 block text-xs text-soft">{{
            t('options.columnsHint')
          }}</span>
          <div class="column-row grid grid-cols-6 mt-2 gap-1.5">
            <template v-for="column in COLUMNS" :key="column">
              <div
                v-if="column === 'old'"
                class="old-column"
                @mouseenter="oldHelp = true"
                @mouseleave="oldHelp = false"
                @focusin="oldHelp = true"
                @focusout="oldHelp = false"
                @pointerdown.stop
              >
                <RegionOption
                  class="w-full"
                  :active="columnShown('old')"
                  :aria-describedby="oldDescriptionId"
                  :label="t('region.old.full')"
                  :native-title="false"
                  :parts="[{ suffix: t('region.old.short') }]"
                  @select="toggleOldColumn()"
                />
                <div
                  class="old-tooltip"
                  :class="{ 'old-tooltip-open': oldHelp }"
                >
                  <p :id="oldDescriptionId">
                    {{ t('region.old.description') }}
                  </p>
                  <a
                    :href="oldFormWikipedia"
                    class="old-tooltip-link focus-ring"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>{{ t('region.old.wikipedia') }}</span>
                    <span
                      class="i-ri-external-link-line block shrink-0"
                      aria-hidden="true"
                    />
                  </a>
                </div>
              </div>
              <RegionOption
                v-else
                class="w-full"
                :active="columnShown(column)"
                :disabled="columnLocked(column)"
                :label="t(`region.${column}.full`)"
                :parts="[{ region: column }]"
                :title="
                  columnLocked(column)
                    ? t('options.columnsLast')
                    : t(`region.${column}.full`)
                "
                @select="toggleColumn(column)"
              />
            </template>
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

/*
 * The note hangs off the row, not off the cell: one track of six is nowhere
 * near wide enough to set a sentence in, so the cell is left unpositioned and
 * the row becomes the containing block the note is measured against.
 */
.column-row {
  position: relative;
}

.old-tooltip {
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.375rem);
  left: 0;
  z-index: 1;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--c-rule);
  border-radius: 6px;
  visibility: hidden;
  background: var(--c-paper);
  box-shadow: 0 8px 20px rgb(0 0 0 / 0.06);
  color: var(--c-ink-soft);
  font-size: 0.75rem;
  line-height: 1.5;
  opacity: 0;
  pointer-events: none;
  transform: translateY(0.25rem);
  transition:
    opacity 120ms ease,
    transform 120ms ease,
    visibility 0s linear 120ms;
}

/*
 * Keep the hover path continuous across the small visual gap -- exactly the gap
 * and no more, so the bridge never lies over the chips in the row. The note
 * stays directly above its own chip for this reason: parked beside the panel it
 * was unreachable, because the pointer had to cross the two chips between the
 * kyujitai and the panel's edge and left the hover path on the first of them.
 */
.old-tooltip::after {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  height: 0.375rem;
  content: '';
}

.old-tooltip-open {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
  transition-delay: 0s;
}

.old-tooltip-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
  color: var(--c-ink);
  text-decoration: underline;
  text-decoration-color: var(--c-rule);
  text-underline-offset: 0.18em;
}

.old-tooltip-link:hover {
  text-decoration-color: currentColor;
}
</style>
