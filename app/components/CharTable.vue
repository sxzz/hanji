<script setup lang="ts">
import { injectChars } from '~/composables/chars.ts'

const chars = injectChars()
const { t, number } = useT()
const { flagsOn, visibleRegions, columnTracks } = usePrefs()
const scrollToTop = useScrollToTop()

const list = ref<HTMLElement>()
const headerViewport = ref<HTMLElement>()

/**
 * Narrow screens scroll instead of crushing the regional forms together. The
 * fixed allowance covers the overprint thumbnail, gaps and row padding; every
 * visible region then keeps a comfortable character column.
 */
const tableMinWidth = computed(
  () => `${visibleRegions.value.length * 4.5 + 8}rem`,
)

/** Keep the sticky header aligned with the horizontally moving data rows. */
function syncHeader(event: Event) {
  if (headerViewport.value)
    headerViewport.value.scrollLeft = (
      event.currentTarget as HTMLElement
    ).scrollLeft
}

function turnTo(page: number) {
  chars.page.value = Math.min(Math.max(1, page), chars.pageCount.value)
  scrollToTop(list.value)
}
</script>

<template>
  <div ref="list" class="border border-rule rounded-lg bg-paper">
    <div
      ref="headerViewport"
      class="sticky top-[var(--nav-h)] z-10 overflow-hidden rounded-t-lg bg-paper"
    >
      <div
        class="row-grid items-center gap-2 border-b border-rule bg-paper px-2 py-2 sm:gap-3 sm:px-5"
        :class="{ 'table-track': chars.rows.value.length }"
        :style="{ '--table-min-width': tableMinWidth }"
      >
        <span />
        <div class="grid" :style="{ gridTemplateColumns: columnTracks }">
          <span
            v-for="region in visibleRegions"
            :key="region"
            class="text-center eyebrow !text-$c-ink-soft"
            :title="t(`region.${region}.full`)"
            ><RegionLabel :flag="flagsOn" :region="region"
          /></span>
        </div>
      </div>
    </div>

    <div
      v-if="!chars.rows.value.length"
      class="flex flex-col items-center px-5 py-16 text-center text-sm text-mute"
    >
      <p>{{ t('table.empty') }}</p>
      <button
        type="button"
        class="focus-ring mt-4 btn-ghost bg-paper px-3 py-1.5 text-xs"
        @click="chars.reset()"
      >
        {{ t('filter.clear') }}
      </button>
    </div>

    <div
      v-else
      role="region"
      tabindex="0"
      :aria-label="t('table.scroll')"
      class="char-table-scroll focus-ring overflow-x-auto overscroll-x-contain"
      @scroll.passive="syncHeader"
    >
      <div class="table-track" :style="{ '--table-min-width': tableMinWidth }">
        <CharRowItem
          v-for="row in chars.pageRows.value"
          :key="row.key"
          :row="row"
          :dimension="chars.dimension.value"
        />
      </div>
    </div>

    <nav
      v-if="chars.rows.value.length"
      class="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm sm:px-5"
    >
      <button
        v-if="chars.canShowAll.value"
        type="button"
        class="focus-ring mr-auto text-xs text-mute underline-offset-4 hover:text-ink hover:underline"
        @click="chars.paged.value = !chars.paged.value"
      >
        {{
          chars.paged.value
            ? t('table.showAll', { n: number(chars.rows.value.length) })
            : t('table.paginate')
        }}
      </button>

      <div
        class="ml-auto w-full flex flex-wrap items-center justify-end gap-3 sm:w-auto"
      >
        <label
          class="h-8 inline-flex items-center gap-1.5 border border-rule rounded-md bg-sunk px-2 text-xs text-mute"
        >
          <span>{{ t('table.perPage') }}</span>
          <select
            v-model.number="chars.pageSize.value"
            class="focus-ring min-w-11 cursor-pointer bg-transparent text-right text-xs text-ink font-mono"
            :aria-label="t('table.perPage')"
            :title="t('table.perPage')"
          >
            <option v-for="size in chars.pageSizes" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
        </label>

        <div
          v-if="chars.paged.value"
          class="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:gap-3"
        >
          <button
            type="button"
            class="focus-ring whitespace-nowrap btn-pager"
            :disabled="chars.page.value <= 1"
            @click="turnTo(chars.page.value - 1)"
          >
            {{ t('table.prev') }}
          </button>

          <span
            class="tabular text-center text-xs text-mute font-mono"
            :aria-label="
              t('table.page', {
                page: chars.page.value,
                total: chars.pageCount.value,
              })
            "
          >
            <span aria-hidden="true" class="sm:hidden">
              {{ chars.page.value }}/{{ chars.pageCount.value }}
            </span>
            <span aria-hidden="true" class="hidden sm:inline">
              {{
                t('table.page', {
                  page: chars.page.value,
                  total: chars.pageCount.value,
                })
              }}
            </span>
          </span>

          <button
            type="button"
            class="focus-ring whitespace-nowrap btn-pager"
            :disabled="chars.page.value >= chars.pageCount.value"
            @click="turnTo(chars.page.value + 1)"
          >
            {{ t('table.next') }}
          </button>
        </div>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.table-track {
  min-width: var(--table-min-width);
}

.char-table-scroll {
  scrollbar-color: var(--c-rule) transparent;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}

.char-table-scroll::-webkit-scrollbar {
  height: 0.375rem;
}

.char-table-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--c-rule);
}

@media (min-width: 640px) {
  .table-track {
    min-width: 0;
  }
}
</style>
