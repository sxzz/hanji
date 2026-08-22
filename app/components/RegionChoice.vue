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
</script>

<template>
  <span
    role="group"
    :aria-label="groupLabel"
    class="h-7 max-w-full inline-flex shrink-0 items-center gap-0.5 overflow-x-auto rounded-md bg-sunk p-[3px]"
  >
    <RegionOption
      v-for="option in options"
      :key="option.value"
      :active="model === option.value"
      :label="option.title"
      :parts="option.parts"
      size="compact"
      @select="model = option.value"
    />
  </span>
</template>
