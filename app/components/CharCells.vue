<script setup lang="ts">
import { fontRegionOf, projectSignature, segmentsOf } from '~~/shared/row.ts'
import { REGIONS, type CharRow } from '~~/shared/types.ts'

const props = withDefaults(
  defineProps<{
    row: CharRow
    dimension?: 'glyph' | 'cp'
    /** Upper bound of the character size in px; narrow screens scale down. */
    size?: number
    showCodePoint?: boolean
  }>(),
  { dimension: 'glyph', size: 60, showCodePoint: true },
)

const { t } = useT()
// The lighter half of usePrefs: this renders once per row, so it stays off the
// preferences that have nothing to say about which columns exist.
const { regions, regionIndices, tracks, showOld } = useColumnVisibility()

// Read over the columns on show: with Japan hidden, a row that ran
// CN | HK+TW | JP has two runs, not three with a gap where Japan was.
const signature = computed(() =>
  projectSignature(
    props.dimension === 'glyph' ? props.row.glyph : props.row.cp,
    regionIndices.value,
  ),
)
const segments = computed(() => segmentsOf(signature.value))

/** One run means one form everywhere, which color cannot usefully encode. */
const colorOf = (group: number) =>
  segments.value.length === 1 ? 'var(--c-rule)' : `var(--c-g${group + 1})`

const LANG = { cn: 'zh-CN', hk: 'zh-HK', tw: 'zh-TW', jp: 'ja' } as const

const cells = computed(() =>
  regions.value.map((region) => {
    const index = REGIONS.indexOf(region)
    // REGIONS and chars are both length 4, so this index is always in range
    const char = props.row.chars[index]!
    return {
      region,
      char,
      font: fontRegionOf(props.row, index),
      lang: LANG[region],
      codePoint: `U+${char.codePointAt(0)!.toString(16).toUpperCase()}`,
      // Only Japan has a second historical form to show
      old: region === 'jp' && showOld.value ? props.row.old?.char : undefined,
    }
  }),
)
</script>

<template>
  <div class="grid" :style="{ gridTemplateColumns: tracks }">
    <div
      v-for="cell in cells"
      :key="cell.region"
      class="min-w-0 flex flex-col items-center gap-0.5"
    >
      <!-- lang is accessibility semantics, unrelated to the interface
           language; it also drives fallback if a subset has not loaded -->
      <span
        :lang="cell.lang"
        :class="`hanji-${cell.font}`"
        :style="{ fontSize: `clamp(1.75rem, 7vw, ${size}px)`, lineHeight: 1.1 }"
        >{{ cell.char }}</span
      >
      <span
        v-if="showCodePoint"
        class="tabular hidden text-[0.625rem] text-mute font-mono sm:block"
        >{{ cell.codePoint }}</span
      >
      <span
        v-if="cell.old"
        class="flex items-baseline gap-1 text-[0.625rem] text-mute"
        :title="t('table.old')"
      >
        <span class="font-mono">{{ t('table.old') }}</span>
        <span lang="ja" class="hanji-jp text-sm leading-none">{{
          cell.old
        }}</span>
      </span>
    </div>

    <!--
      Regions in one group join into a single run; the number of runs is the
      number of distinct forms.
    -->
    <div
      class="grid mt-1.5 gap-[3px]"
      :style="{
        gridColumn: `1 / span ${cells.length}`,
        gridTemplateColumns: tracks,
      }"
    >
      <span
        v-for="segment in segments"
        :key="segment.start"
        class="h-[3px] rounded-full"
        :style="{
          gridColumn: `${segment.start + 1} / span ${segment.span}`,
          background: colorOf(segment.group),
        }"
      />
    </div>
  </div>
</template>
