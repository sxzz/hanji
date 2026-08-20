<script setup lang="ts">
import type { Region } from '~~/shared/types.ts'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ flag: boolean; region: Region }>()
const { t } = useT()
</script>

<template>
  <img
    v-if="props.flag"
    v-bind="$attrs"
    :src="`/flags/${props.region}.svg`"
    :alt="t(`region.${props.region}.full`)"
    class="region-flag"
    width="512"
    height="512"
  />
  <span v-else v-bind="$attrs">{{ t(`region.${props.region}.short`) }}</span>
</template>
