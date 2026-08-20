<script setup lang="ts">
defineProps<{
  signature: string
  count: number
  active: boolean
  label: string
}>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <!--
    Selection is a filled state rather than a border, so which chips are on
    reads at a glance across the grid.
  -->
  <button
    type="button"
    class="chip gap-2 disabled:opacity-30 focus-ring"
    :class="active ? 'chip-on' : 'chip-off'"
    :disabled="count === 0 && !active"
    :title="label"
    :aria-label="label"
    :aria-pressed="active"
    @click="$emit('toggle')"
  >
    <SegmentBar :signature="signature" :width="30" :height="9" />
    <span class="tabular text-[0.6875rem] font-mono">{{ count }}</span>
  </button>
</template>
