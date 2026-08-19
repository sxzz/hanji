<script setup lang="ts">
import { charPath, morphName, useMorphingKey } from '~/composables/chars.ts'
import type { CharRow } from '~~/shared/types.ts'

const props = defineProps<{
  row: CharRow
  dimension: 'glyph' | 'cp'
}>()

const morphing = useMorphingKey()
const route = useRoute()

/**
 * Hand the thumbnail its view-transition-name before navigating, so the
 * browser has something to match against on the detail page. Only the row
 * being opened gets one: a name has to be unique in the document.
 *
 * A click asking for a new tab or window is left to the browser -- there is
 * nothing here to morph into, and the reader keeps their place in the list.
 */
async function open(event: MouseEvent) {
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    (event.button !== undefined && event.button !== 0)
  )
    return
  event.preventDefault()
  morphing.value = props.row.key
  listPlace.value = { fullPath: route.fullPath, scrollY: window.scrollY }
  await nextTick()
  await navigateTo(charPath(props.row.key))
}
</script>

<template>
  <NuxtLink
    :to="charPath(row.key)"
    class="row-grid items-center gap-2 border-b border-rule px-2 py-2.5 transition-colors duration-100 sm:gap-3 hover:bg-sunk sm:px-5 focus-ring"
    @click="open"
  >
    <!-- Overprint thumbnail: more color fringing means a bigger difference -->
    <div class="flex-center">
      <OverprintChar
        :row="row"
        size="clamp(1.5rem, 5.5vw, 42px)"
        :morph="morphing === row.key ? morphName(row.key) : undefined"
        morph-whole
      />
    </div>

    <CharCells :row="row" :dimension="dimension" />

    <div class="tabular text-right text-xs text-soft font-mono">
      <span v-if="row.strokes[0]">{{ row.strokes[0] }}</span>
      <span
        v-if="row.strokes[1] && row.strokes[1] !== row.strokes[0]"
        class="text-mute"
      >
        /{{ row.strokes[1] }}
      </span>
    </div>

    <div class="tabular hidden text-right text-xs text-mute font-mono sm:block">
      <span v-if="row.freq">#{{ row.freq }}</span>
      <span v-else>—</span>
    </div>
  </NuxtLink>
</template>
