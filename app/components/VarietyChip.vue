<script setup lang="ts">
defineProps<{
  label: string
  count: number
  active: boolean
  partial: boolean
}>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    class="focus-ring chip justify-between gap-2 text-xs disabled:opacity-30"
    :class="
      active
        ? 'chip-on'
        : partial
          ? 'border-ink/35 bg-sunk text-ink'
          : 'chip-off'
    "
    :disabled="count === 0 && !active && !partial"
    :aria-pressed="partial ? 'mixed' : active"
    @click="$emit('toggle')"
  >
    <span class="whitespace-nowrap">{{ label }}</span>
    <span class="tabular text-[0.6875rem] opacity-70 font-mono">{{
      count
    }}</span>
  </button>
</template>
