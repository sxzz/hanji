<script setup lang="ts">
import { ABOUT_OG_PATH } from '~~/shared/brand.ts'
import { ISSUES_URL, REPO_URL } from '~~/shared/links.ts'
import charsDataUrl from '~/assets/data/chars.json?url&no-inline'
import { stats } from '~/composables/chars.ts'

const { t } = useT()
const { buildInfo } = useAppConfig()
const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`
const CC_BY_URL = 'https://creativecommons.org/licenses/by/4.0/'
const buildTimeLabel = `${buildInfo.builtAt.slice(0, 16).replace('T', ' ')} UTC`
const shortBuildSha = buildInfo.sha.slice(0, 7)
const buildCommitUrl = `${REPO_URL}/commit/${buildInfo.sha}`

const numbers = computed(() => ({
  rows: stats.rows.toLocaleString(),
  identical: stats.identical.toLocaleString(),
  allDiffer: stats.allDiffer.toLocaleString(),
}))

usePageSeo({
  path: '/about',
  pageType: 'AboutPage',
  title: () => t('about.title'),
  socialTitle: () => `${t('about.title')} · ${t('meta.title')}`,
  description: () => t('meta.description'),
  imagePath: ABOUT_OG_PATH,
  imageAlt: () => `${t('about.title')} · ${t('meta.title')}`,
})
</script>

<template>
  <article class="pb-8">
    <div class="prose-page max-w-2xl">
      <header class="mb-10 flex flex-col items-start gap-6 pt-6 sm:pt-8">
        <HanjiMark class="size-32 sm:size-40" />
        <h1 class="text-2xl">{{ t('about.title') }}</h1>
      </header>

      <h2>{{ t('about.nameTitle') }}</h2>
      <p>{{ t('about.name1') }}</p>
      <p>{{ t('about.name2') }}</p>

      <h2>{{ t('about.scopeTitle') }}</h2>
      <p>{{ t('about.scope1', numbers) }}</p>
      <p>{{ t('about.scope2', numbers) }}</p>
      <p>{{ t('about.scope3') }}</p>

      <h2>{{ t('about.methodTitle') }}</h2>
      <p>{{ t('about.method1') }}</p>
      <p>{{ t('about.method2') }}</p>
      <p>{{ t('about.method3') }}</p>

      <h2>{{ t('about.limitTitle') }}</h2>
      <ul>
        <li>{{ t('about.limitPrint') }}</li>
        <li>{{ t('about.limit1') }}</li>
        <li>{{ t('about.limit2') }}</li>
        <li>{{ t('about.limit3') }}</li>
        <li>{{ t('about.limit4') }}</li>
        <li>{{ t('about.limit5') }}</li>
        <li>{{ t('about.limit6') }}</li>
      </ul>

      <h2>{{ t('about.noticeTitle') }}</h2>
      <p>{{ t('about.notice1') }}</p>
      <p>{{ t('about.notice2') }}</p>
      <p>{{ t('about.notice3') }}</p>
      <I18nText :template="t('about.notice4')">
        <template #issues>
          <a :href="ISSUES_URL" target="_blank" rel="noreferrer"
            >GitHub issue</a
          >
        </template>
      </I18nText>

      <h2>{{ t('about.dataTitle') }}</h2>
      <p>{{ t('about.data1') }}</p>
      <ul>
        <li>
          <a href="/data/chars.json" :data-versioned-url="charsDataUrl"
            >/data/chars.json</a
          >
        </li>
        <li>
          <a href="/notices/data-sources.md">data-sources.md</a>
        </li>
      </ul>

      <h2>{{ t('about.licenseTitle') }}</h2>
      <I18nText :template="t('about.licenseCode')">
        <template #mit>
          <a :href="LICENSE_URL" target="_blank" rel="noreferrer">MIT</a>
        </template>
        <template #licenseFile>
          <a :href="LICENSE_URL" target="_blank" rel="noreferrer">LICENSE</a>
        </template>
      </I18nText>
      <I18nText :template="t('about.licenseData')">
        <template #cc>
          <a :href="CC_BY_URL" target="_blank" rel="noreferrer">CC BY 4.0</a>
        </template>
      </I18nText>
      <p>{{ t('about.licenseThirdParty') }}</p>
      <p>{{ t('about.licenseBrand') }}</p>

      <h2 id="brand-assets">{{ t('about.brandAssetsTitle') }}</h2>
      <I18nText :template="t('about.brandAssets')">
        <template #designer>
          <a
            href="https://github.com/Innei"
            target="_blank"
            rel="noopener noreferrer"
            >Innei</a
          >
        </template>
      </I18nText>

      <h2>{{ t('about.sourcesTitle') }}</h2>
    </div>
    <DataSources detailed />

    <div class="prose-page max-w-2xl">
      <h2>{{ t('about.thanksTitle') }}</h2>
      <I18nText :template="t('about.thanks')">
        <template #tofu>
          <a href="https://tofu.tools/" target="_blank" rel="noreferrer"
            >tofu.tools</a
          >
        </template>
        <template #innei>
          <a
            href="https://github.com/Innei"
            target="_blank"
            rel="noopener noreferrer"
            >Innei</a
          >
        </template>
        <template #oliver>
          <a
            href="https://github.com/oliver139"
            target="_blank"
            rel="noopener noreferrer"
            >Oliver オリバー</a
          >
        </template>
        <template #antfu>
          <a
            href="https://github.com/antfu"
            target="_blank"
            rel="noopener noreferrer"
            >Anthony Fu</a
          >
        </template>
      </I18nText>
    </div>

    <footer class="mt-16 max-w-2xl border-t border-rule py-6">
      <p
        class="tabular flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-mute"
      >
        <span class="inline-flex items-baseline gap-1.5">
          <span>{{ t('about.buildLabel') }}</span>
          <time class="font-mono" :datetime="buildInfo.builtAt">{{
            buildTimeLabel
          }}</time>
        </span>
        <a
          v-if="buildInfo.sha"
          :href="buildCommitUrl"
          :title="buildInfo.sha"
          target="_blank"
          rel="noopener noreferrer"
          class="focus-ring rule-link font-mono"
          >SHA {{ shortBuildSha }}</a
        >
      </p>
    </footer>
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
