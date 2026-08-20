<script setup lang="ts" generic="T extends string">
defineProps<{
  options: readonly {
    value: T
    label: string
    title?: string
    ariaLabel?: string
    suffix?: string
  }[]
}>()
const model = defineModel<T>({ required: true })
const emit = defineEmits<{ repeat: [value: T] }>()

function choose(value: T) {
  if (model.value === value) emit('repeat', value)
  else model.value = value
}
</script>

<template>
  <div class="h-7 inline-flex border border-rule rounded-md bg-sunk p-[2px]">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="flex items-center gap-1 rounded px-2.5 text-xs transition-colors duration-150 focus-ring"
      :class="
        model === option.value
          ? 'bg-paper text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)]'
          : 'text-mute hover:text-soft'
      "
      :title="option.title"
      :aria-label="option.ariaLabel"
      :aria-pressed="model === option.value"
      @click="choose(option.value)"
    >
      {{ option.label }}
      <span v-if="option.suffix" aria-hidden="true">{{ option.suffix }}</span>
    </button>
  </div>
</template>
