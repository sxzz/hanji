<script setup lang="ts">
defineProps<{
  signature: string
  count: number
  active: boolean
}>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <!--
    Selection is a filled state rather than a border, so which chips are on
    reads at a glance across a grid of fifteen.
  -->
  <button
    type="button"
    class="h-7 flex items-center gap-2 border rounded-md px-2 transition-colors duration-150 disabled:opacity-30 focus-ring"
    :class="
      active
        ? 'border-$c-ink bg-$c-ink text-$c-paper'
        : 'border-rule bg-paper text-soft hover:border-ink/30'
    "
    :disabled="count === 0"
    :aria-pressed="active"
    @click="$emit('toggle')"
  >
    <SegmentBar :signature="signature" :width="30" :height="9" />
    <span class="tabular text-[0.6875rem] font-mono">{{ count }}</span>
  </button>
</template>
