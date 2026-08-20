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
    class="h-7 flex items-center justify-between gap-2 border rounded-md px-2 text-xs transition-colors duration-150 disabled:opacity-30 focus-ring"
    :class="
      active
        ? 'border-$c-ink bg-$c-ink text-$c-paper'
        : partial
          ? 'border-ink/35 bg-sunk text-ink'
          : 'border-rule bg-paper text-soft hover:border-ink/30'
    "
    :disabled="count === 0 && !active && !partial"
    :aria-pressed="partial ? 'mixed' : active"
    @click="$emit('toggle')"
  >
    <span class="whitespace-nowrap">{{ label }}</span>
    <span class="tabular text-[0.6875rem] font-mono opacity-70">{{
      count
    }}</span>
  </button>
</template>
