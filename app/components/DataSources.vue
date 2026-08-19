<script setup lang="ts">
import sources from '~~/public/data/sources.json'
import type { Source } from '~~/scripts/sources.ts'

withDefaults(defineProps<{ detailed?: boolean }>(), { detailed: false })

const { t, locale } = useT()
const list = sources as Source[]
const localize = (
  fallback: string,
  translations?: Source['localizedName'],
): string => translations?.[locale.value] ?? fallback
</script>

<template>
  <div class="text-sm">
    <table class="w-full border-collapse text-left">
      <thead>
        <tr class="border-b border-rule">
          <th class="py-2 pr-4 eyebrow font-normal">{{ t('about.use') }}</th>
          <th class="py-2 pr-4 eyebrow font-normal">{{ t('about.source') }}</th>
          <th class="py-2 eyebrow font-normal">{{ t('about.license') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="source in list"
          :key="source.id"
          class="border-b border-rule/60 align-top"
        >
          <td class="py-2.5 pr-4 text-soft">{{ source.use[locale] }}</td>
          <td class="py-2.5 pr-4">
            <a
              :href="source.homepage"
              target="_blank"
              rel="noreferrer"
              class="underline decoration-rule underline-offset-4 hover:decoration-ink focus-ring"
              >{{ localize(source.name, source.localizedName) }}</a
            >
            <p
              v-if="detailed && source.note"
              class="mt-1 text-xs text-mute leading-relaxed"
            >
              {{ source.note[locale] }}
            </p>
          </td>
          <td class="py-2.5 text-xs text-mute">
            <a
              :href="source.licenseUrl"
              target="_blank"
              rel="noreferrer"
              class="underline decoration-transparent underline-offset-4 hover:decoration-current focus-ring"
              >{{ localize(source.license, source.localizedLicense) }}</a
            >
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
