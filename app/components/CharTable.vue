<script setup lang="ts">
import { injectChars } from '~/composables/chars.ts'

const chars = injectChars()
const { t } = useT()
const { regionLabel, labelClass, visibleRegions, columnTracks } = usePrefs()
const scrollToTop = useScrollToTop()

const list = ref<HTMLElement>()

function turnTo(page: number) {
  chars.page.value = Math.min(Math.max(1, page), chars.pageCount.value)
  scrollToTop(list.value)
}
</script>

<template>
  <div ref="list" class="overflow-clip border border-rule rounded-lg bg-paper">
    <div
      class="row-grid sticky top-0 z-10 items-center gap-2 border-b border-rule bg-paper px-2 py-2 sm:gap-3 sm:px-5"
    >
      <span />
      <div class="grid" :style="{ gridTemplateColumns: columnTracks }">
        <span
          v-for="region in visibleRegions"
          :key="region"
          class="text-center eyebrow !text-$c-ink-soft"
          :title="t(`region.${region}.full`)"
          ><span :class="labelClass">{{ regionLabel(region) }}</span></span
        >
      </div>
      <span class="text-right eyebrow">{{ t('table.strokes') }}</span>
      <span class="hidden text-right eyebrow sm:block">{{
        t('table.freq')
      }}</span>
    </div>

    <p
      v-if="!chars.rows.value.length"
      class="px-5 py-16 text-center text-sm text-mute"
    >
      {{ t('table.empty') }}
    </p>

    <template v-else>
      <CharRowItem
        v-for="row in chars.pageRows.value"
        :key="row.key"
        :row="row"
        :dimension="chars.dimension.value"
      />

      <nav
        v-if="chars.pageCount.value > 1 || chars.canShowAll.value"
        class="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm sm:px-5"
      >
        <button
          v-if="chars.paged.value"
          type="button"
          class="border border-rule rounded-md px-3 py-1.5 text-soft transition-colors duration-150 disabled:opacity-35 focus-ring enabled:hover:border-ink/25 enabled:hover:text-ink"
          :disabled="chars.page.value <= 1"
          @click="turnTo(chars.page.value - 1)"
        >
          {{ t('table.prev') }}
        </button>

        <span
          v-if="chars.paged.value"
          class="tabular text-xs text-mute font-mono"
        >
          {{
            t('table.page', {
              page: chars.page.value,
              total: chars.pageCount.value,
            })
          }}
        </span>

        <button
          v-if="chars.paged.value"
          type="button"
          class="border border-rule rounded-md px-3 py-1.5 text-soft transition-colors duration-150 disabled:opacity-35 focus-ring enabled:hover:border-ink/25 enabled:hover:text-ink"
          :disabled="chars.page.value >= chars.pageCount.value"
          @click="turnTo(chars.page.value + 1)"
        >
          {{ t('table.next') }}
        </button>

        <!-- Once the result set is small enough to render whole, paging is
             just friction -->
        <button
          v-if="chars.canShowAll.value"
          type="button"
          class="ml-auto text-xs text-mute underline-offset-4 hover:text-ink hover:underline focus-ring"
          @click="chars.paged.value = !chars.paged.value"
        >
          {{
            chars.paged.value
              ? t('table.showAll', { n: chars.rows.value.length })
              : t('table.paginate')
          }}
        </button>
      </nav>
    </template>
  </div>
</template>
