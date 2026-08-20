<script setup lang="ts">
import { segmentsOf } from '~~/shared/row.ts'

const props = withDefaults(
  defineProps<{
    /** Partition signature, e.g. "0112". */
    signature: string
    width?: number
    height?: number
  }>(),
  { width: 34, height: 10 },
)

const segments = computed(() => segmentsOf(props.signature))

/** One run means one form everywhere, which color cannot usefully encode. */
const colorOf = (group: number) =>
  segments.value.length === 1 ? 'var(--c-ink-mute)' : groupColor(group)
</script>

<template>
  <!--
    The gaps between runs are the primary signal, color the redundant second
    one, so the number of distinct forms stays readable in grayscale.
  -->
  <span
    class="flex gap-[2px]"
    :style="{ width: `${width}px`, height: `${height}px` }"
    aria-hidden="true"
  >
    <span
      v-for="segment in segments"
      :key="segment.start"
      class="rounded-[1px]"
      :style="{
        flexGrow: segment.span,
        background: colorOf(segment.group),
      }"
    />
  </span>
</template>
