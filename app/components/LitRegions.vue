<script setup lang="ts">
import type { Column } from '~~/shared/types.ts'

/**
 * Whose form is lit, for the line under a walking stack.
 *
 * The walk shows one form at a time without saying whose it is, which is the
 * one thing a reader watching it wants to know. Set in that form's own accent,
 * so the name and the shape it belongs to are read as one thing.
 */
const props = defineProps<{
  /** Columns sharing the lit form, in display order. */
  columns: readonly Column[]
  group: number
  /** Match a stack whose row rotates the overprint palette. */
  color?: string
}>()

const { t } = useT()
const { flagsOn } = usePrefs()

/** The kyujitai is Japan's, and says which of Japan's two it is. */
const marks = computed(() =>
  props.columns.map((column) => ({
    column,
    region: column === 'old' ? undefined : column,
    old: column === 'old' ? t('region.old.short') : undefined,
  })),
)
</script>

<template>
  <span
    class="lit-regions eyebrow"
    :style="{ color: color ?? groupColor(group) }"
  >
    <span v-for="mark in marks" :key="mark.column" class="lit-region">
      <RegionLabel v-if="mark.region" :flag="flagsOn" :region="mark.region" />
      <template v-if="mark.old">{{ mark.old }}</template>
    </span>
  </span>
</template>

<style scoped>
/* Spaced so 中 港 reads as two places rather than as one word. */
.lit-regions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4em;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.lit-region {
  display: inline-flex;
  align-items: center;
  gap: 0.2em;
}
</style>
