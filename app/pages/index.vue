<script setup lang="ts">
import { HOME_OG_PATH } from '~~/shared/brand.ts'
import { provideChars } from '~/composables/chars.ts'

const { t } = useT()
provideChars()

usePageSeo({
  path: '/',
  pageType: 'CollectionPage',
  socialTitle: () =>
    `${t('meta.title')} ${t('meta.name')} · ${t('meta.slogan')}`,
  description: () => t('meta.description'),
  imagePath: HOME_OG_PATH,
  imageAlt: () => `${t('meta.title')} — ${t('meta.slogan')}`,
})
</script>

<template>
  <div class="flex flex-col gap-8 pb-4 sm:gap-10">
    <HeroOverprint />
    <FilterBar />
    <CharTable />
  </div>
</template>
