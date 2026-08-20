<script setup lang="ts">
import { STYLES } from '~~/shared/types.ts'
import { useStyle } from '~/composables/style.ts'
import { FACE_MARKS, FACE_VIEW_BOX } from '~/generated/face-marks.ts'

const { t } = useT()
const style = useStyle()

const toggle = () => {
  style.value = style.value === 'sans' ? 'serif' : 'sans'
}

/**
 * Each label is an outline lifted from the face it names, because the two
 * designs have to show at once and one font file cannot hold both. Falls back
 * to plain text if a locale labels the switch with something the build did
 * not see.
 */
const markOf = (option: string) => FACE_MARKS[option]?.[t(`style.${option}`)]
</script>

<template>
  <!--
    One control, not two targets: the pair reads as a single switch, and the
    label shows which side is on.

    Which half looks active is decided by `data-style` on the root, not by a
    class binding. The root attribute is written by an inline script before
    first paint, whereas a class rendered at prerender time says "sans" and
    hydration does not rewrite it -- so a reader who chose serif would come
    back to a switch pointing at the wrong one.
  -->
  <button
    type="button"
    class="focus-ring h-8 flex items-center rounded px-1"
    :title="t('style.label')"
    :aria-label="t('style.label')"
    @click="toggle"
  >
    <template v-for="(option, index) in STYLES" :key="option">
      <span v-if="index" class="px-0.5 text-$c-ink-mute" aria-hidden="true"
        >/</span
      >
      <span class="style-option" :data-option="option">
        <svg
          v-if="markOf(option)"
          :viewBox="FACE_VIEW_BOX"
          class="block h-[1em] w-[1em] fill-current"
          role="img"
          :aria-label="t(`style.${option}Full`)"
        >
          <path :d="markOf(option)" />
        </svg>
        <template v-else>{{ t(`style.${option}`) }}</template>
      </span>
    </template>
  </button>
</template>
