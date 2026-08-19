<script setup lang="ts">
import { HERO_ROW, provideChars } from '~/composables/chars.ts'

const { t } = useT()
provideChars()

useSeoMeta({ description: () => t('meta.description') })
</script>

<template>
  <div class="flex flex-col gap-10 pb-4">
    <HeroOverprint :row="HERO_ROW" />
    <FilterBar />
    <CharTable />
  </div>
</template>
