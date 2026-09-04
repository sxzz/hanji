<script setup lang="ts">
import {
  charPath,
  morphName,
  opensElsewhere,
  useMorphingKey,
  useMorphTo,
} from '~/composables/char-navigation.ts'
import { injectChars } from '~/composables/chars.ts'
import { GOATCOUNTER_EVENTS } from '~/utils/goatcounter.ts'
import type { CharRow } from '~~/shared/types.ts'

const props = defineProps<{
  row: CharRow
  dimension: 'glyph' | 'cp'
}>()

const morphing = useMorphingKey()
const morphTo = useMorphTo()
const chars = injectChars()
const route = useRoute()
const goatCounter = useGoatCounter()

/**
 * Opening a row records where the reader was standing in the list, which is
 * the only thing that does -- see router.options.ts. The morph itself is the
 * same one the hero performs, and lives with it.
 */
async function open(event: MouseEvent) {
  if (chars.query.value.trim())
    goatCounter?.event(...GOATCOUNTER_EVENTS.searchResultOpen)
  if (opensElsewhere(event)) return
  event.preventDefault()
  listPlace.value = { fullPath: route.fullPath, scrollY: window.scrollY }
  await morphTo(props.row.key, 'row')
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
        :common-regions="chars.common.value"
        size="clamp(1.75rem, 7vw, 60px)"
        :morph="
          morphing?.from === 'row' && morphing.key === row.key
            ? morphName(row.key)
            : undefined
        "
        morph-whole
      />
    </div>

    <CharCells :row="row" :dimension="dimension" />
  </NuxtLink>
</template>
