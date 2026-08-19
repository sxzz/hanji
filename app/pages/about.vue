<script setup lang="ts">
import { ISSUES_URL } from '~~/shared/links.ts'
import { useChars } from '~/composables/chars.ts'

const { t } = useT()
const { stats } = useChars()

const numbers = computed(() => ({
  rows: stats.rows.toLocaleString(),
  identical: stats.identical.toLocaleString(),
  allDiffer: stats.allDiffer.toLocaleString(),
}))

useSeoMeta({
  title: () => t('about.title'),
  description: () => t('meta.description'),
})
</script>

<template>
  <article class="prose-page max-w-2xl pb-8">
    <h1 class="mb-8 text-2xl">{{ t('about.title') }}</h1>

    <h2>{{ t('about.nameTitle') }}</h2>
    <p>{{ t('about.name1') }}</p>
    <p>{{ t('about.name2') }}</p>

    <h2>{{ t('about.scopeTitle') }}</h2>
    <p>{{ t('about.scope1', numbers) }}</p>
    <p>{{ t('about.scope2', numbers) }}</p>

    <h2>{{ t('about.methodTitle') }}</h2>
    <p>{{ t('about.method1') }}</p>
    <p>{{ t('about.method2') }}</p>
    <p>{{ t('about.method3') }}</p>

    <h2>{{ t('about.limitTitle') }}</h2>
    <ul>
      <li>{{ t('about.limit1') }}</li>
      <li>{{ t('about.limit2') }}</li>
      <li>{{ t('about.limit3') }}</li>
      <li>{{ t('about.limit4') }}</li>
      <li>{{ t('about.limit5') }}</li>
    </ul>

    <h2>{{ t('about.noticeTitle') }}</h2>
    <p>{{ t('about.notice1') }}</p>
    <p>{{ t('about.notice2') }}</p>
    <p>{{ t('about.notice3') }}</p>
    <I18nText :template="t('about.notice4')">
      <template #issues>
        <a :href="ISSUES_URL" target="_blank" rel="noreferrer">GitHub issue</a>
      </template>
    </I18nText>

    <h2>{{ t('about.dataTitle') }}</h2>
    <p>{{ t('about.data1') }}</p>
    <ul>
      <li><a href="/data/chars.json">/data/chars.json</a></li>
      <li><a href="/data/sources.json">/data/sources.json</a></li>
    </ul>

    <h2>{{ t('about.sourcesTitle') }}</h2>
    <DataSources detailed />

    <h2>{{ t('about.thanksTitle') }}</h2>
    <I18nText :template="t('about.thanks')">
      <template #tofu>
        <a href="https://tofu.tools/" target="_blank" rel="noreferrer"
          >tofu.tools</a
        >
      </template>
    </I18nText>
  </article>
</template>

<style scoped>
.prose-page :deep(h2) {
  margin: 2.5rem 0 0.75rem;
  font-size: 1rem;
  font-weight: 500;
}
.prose-page :deep(p),
.prose-page :deep(li) {
  margin-bottom: 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.85;
  color: var(--c-ink-soft);
}
.prose-page :deep(ul) {
  padding-left: 1.1rem;
  list-style: disc;
}
.prose-page :deep(a) {
  text-decoration: underline;
  text-decoration-color: var(--c-rule);
  text-underline-offset: 4px;
}
.prose-page :deep(a:hover) {
  text-decoration-color: currentColor;
}
</style>
