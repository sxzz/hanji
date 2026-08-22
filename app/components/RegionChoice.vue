<script setup lang="ts" generic="T extends string">
import type { Region } from '~~/shared/types.ts'

defineProps<{
  groupLabel: string
  options: readonly {
    value: T
    parts: readonly {
      region?: Region
      suffix?: string
    }[]
    title: string
  }[]
}>()
const model = defineModel<T>({ required: true })
const { flagsOn } = usePrefs()
</script>

<template>
  <span
    role="group"
    :aria-label="groupLabel"
    class="h-7 max-w-full inline-flex shrink-0 items-center gap-px overflow-x-auto border border-rule rounded-md bg-sunk p-[2px]"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="focus-ring flex shrink-0 items-center justify-center gap-1 rounded text-[0.6875rem] transition-colors duration-150"
      :class="[
        model === option.value
          ? 'bg-paper text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)]'
          : 'text-mute hover:text-soft',
        option.parts.length > 1 || option.parts.some((part) => part.suffix)
          ? 'h-[22px] min-w-[22px] px-1.5'
          : 'size-[22px]',
      ]"
      :title="option.title"
      :aria-label="option.title"
      :aria-pressed="model === option.value"
      @click="model = option.value"
    >
      <span
        v-for="(part, index) in option.parts"
        :key="`${part.region ?? ''}:${part.suffix ?? ''}:${index}`"
        class="inline-flex items-center gap-1"
      >
        <RegionLabel
          v-if="part.region"
          :flag="flagsOn"
          :region="part.region"
          aria-hidden="true"
        />
        <span v-if="part.suffix">{{ part.suffix }}</span>
      </span>
    </button>
  </span>
</template>
