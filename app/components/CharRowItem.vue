<script setup lang="ts">
import { charPath, morphName, useMorphingKey } from '~/composables/chars.ts'
import type { CharRow } from '~~/shared/types.ts'

const props = defineProps<{
  row: CharRow
  dimension: 'glyph' | 'cp'
}>()

const morphing = useMorphingKey()
const route = useRoute()
const { regionIndices } = useColumnVisibility()

/**
 * The stroke counts the row leads with: the first column on show, and the
 * second only where it disagrees. Reading them off fixed regions would keep
 * quoting a column the reader has taken off the page.
 */
const strokes = computed(() => {
  const [first, second] = regionIndices.value.map((i) => props.row.strokes[i])
  return { first, second: second !== first ? second : undefined }
})

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
    class="row-grid focus-ring items-center gap-2 border-b border-rule px-2 py-2.5 transition-colors duration-100 sm:gap-3 hover:bg-sunk sm:px-5"
    @click="open"
  >
    <!-- Overprint thumbnail: more color fringing means a bigger difference.
         Set at the size of the regional cells beside it, so the row opens with
         the character at full size and then takes it apart, rather than
         leading with a shrunken token of it. -->
    <div class="flex-center">
      <OverprintChar
        :row="row"
        size="clamp(1.75rem, 7vw, 60px)"
        :morph="morphing === row.key ? morphName(row.key) : undefined"
        morph-whole
      />
    </div>

    <CharCells :row="row" :dimension="dimension" />

    <div class="tabular text-right text-xs text-soft font-mono">
      <span v-if="strokes.first">{{ strokes.first }}</span>
      <span v-if="strokes.second" class="text-mute">
        /{{ strokes.second }}
      </span>
    </div>
  </NuxtLink>
</template>
