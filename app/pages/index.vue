<script setup lang="ts">
import {
  HOME_OG_PATH,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
} from '~~/shared/brand.ts'
import { provideChars } from '~/composables/chars.ts'

const { t } = useT()
const siteUrl = useRuntimeConfig().public.siteUrl
const ogImage = new URL(HOME_OG_PATH, siteUrl).href
provideChars()

useSeoMeta({
  description: () => t('meta.description'),
  ogTitle: () => `${t('meta.title')} · ${t('meta.slogan')}`,
  ogDescription: () => t('meta.description'),
  ogImage,
  ogImageAlt: () => `${t('meta.title')} — ${t('meta.slogan')}`,
  ogImageWidth: OG_IMAGE_WIDTH,
  ogImageHeight: OG_IMAGE_HEIGHT,
  ogType: 'website',
  ogUrl: siteUrl,
  ogSiteName: () => t('meta.title'),
  twitterCard: 'summary_large_image',
  twitterTitle: () => `${t('meta.title')} · ${t('meta.slogan')}`,
  twitterDescription: () => t('meta.description'),
  twitterImage: ogImage,
  twitterImageAlt: () => `${t('meta.title')} — ${t('meta.slogan')}`,
})
</script>

<template>
  <div class="flex flex-col gap-8 pb-4 sm:gap-10">
    <HeroOverprint />
    <FilterBar />
    <CharTable />
  </div>
</template>
