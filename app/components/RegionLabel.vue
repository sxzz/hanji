<script setup lang="ts">
import cnFlag from '~/assets/flags/cn.svg?no-inline'
import hkFlag from '~/assets/flags/hk.svg?no-inline'
import jpFlag from '~/assets/flags/jp.svg?no-inline'
import krFlag from '~/assets/flags/kr.svg?no-inline'
import twFlag from '~/assets/flags/tw.svg?no-inline'
import type { Region } from '~~/shared/types.ts'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ flag: boolean; region: Region }>()
const { t } = useT()

const FLAGS: Record<Region, string> = {
  cn: cnFlag,
  hk: hkFlag,
  tw: twFlag,
  jp: jpFlag,
  kr: krFlag,
}
</script>

<template>
  <img
    v-if="props.flag"
    v-bind="$attrs"
    :src="FLAGS[props.region]"
    :alt="t(`region.${props.region}.full`)"
    class="region-flag"
    width="512"
    height="512"
  />
  <span v-else v-bind="$attrs">{{ t(`region.${props.region}.short`) }}</span>
</template>
