<script setup lang="ts">
import { HERO_ROW, provideChars } from '~/composables/chars.ts'

const { t } = useT()
provideChars()

useSeoMeta({ description: () => t('meta.description') })
</script>

<template>
  <div class="flex flex-col gap-8 pb-4 sm:gap-10">
    <HeroOverprint :row="HERO_ROW" />
    <FilterBar />
    <CharTable />
  </div>
</template>
