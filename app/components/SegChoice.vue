<script setup lang="ts" generic="T extends string">
defineProps<{
  options: readonly { value: T; label: string; title?: string }[]
}>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="h-7 inline-flex border border-rule rounded-md bg-sunk p-[2px]">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="flex items-center rounded px-2.5 text-xs transition-colors duration-150 focus-ring"
      :class="
        model === option.value
          ? 'bg-paper text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)]'
          : 'text-mute hover:text-soft'
      "
      :title="option.title"
      :aria-pressed="model === option.value"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
