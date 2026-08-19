<script setup lang="ts">
import { STYLES } from '~~/shared/types.ts'
import { useStyle } from '~/composables/style.ts'

const { t } = useT()
const style = useStyle()

const toggle = () => {
  style.value = style.value === 'sans' ? 'serif' : 'sans'
}
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
    class="flex items-baseline rounded px-1 focus-ring"
    :title="t('style.label')"
    :aria-label="t('style.label')"
    @click="toggle"
  >
    <template v-for="(option, index) in STYLES" :key="option">
      <span v-if="index" class="px-0.5 text-$c-ink-mute" aria-hidden="true"
        >/</span
      >
      <span class="style-option" :data-option="option">{{
        t(`style.${option}`)
      }}</span>
    </template>
  </button>
</template>
