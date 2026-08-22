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
    <table
      class="sources w-full border-collapse text-left"
      :class="{ 'sources-detailed': detailed }"
    >
      <colgroup v-if="detailed">
        <col class="col-use" />
        <col />
        <col class="col-license" />
      </colgroup>
      <thead>
        <tr class="border-b border-rule">
          <th class="eyebrow font-normal">{{ t('about.use') }}</th>
          <th class="eyebrow font-normal">{{ t('about.source') }}</th>
          <th class="eyebrow font-normal">{{ t('about.license') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="source in list"
          :key="source.id"
          class="border-b border-rule/60 align-top"
        >
          <td class="cell-use text-soft">{{ source.use[locale] }}</td>
          <td class="cell-name">
            <a
              :href="source.homepage"
              target="_blank"
              rel="noreferrer"
              class="focus-ring rule-link"
              >{{ localize(source.name, source.localizedName) }}</a
            >
            <p
              v-if="detailed && source.note"
              class="mt-1 text-xs text-mute leading-relaxed"
            >
              {{ source.note[locale] }}
            </p>
          </td>
          <td class="cell-license text-xs text-mute">
            <a
              :href="source.licenseUrl"
              target="_blank"
              rel="noreferrer"
              class="focus-ring underline decoration-transparent underline-offset-4 hover:decoration-current"
              >{{ localize(source.license, source.localizedLicense) }}</a
            >
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/*
 * Three columns of Han text will not fit a phone -- squeezed to a third of
 * 390px, a heading like “简繁、港台异体、日本新旧字体对应” sets one character
 * per line. So below sm each source reads as a block instead: what it is for,
 * what it is, what it is licensed under. The header row then has nothing left
 * to head, and the first cell carries its own label register.
 */
.sources,
.sources tbody,
.sources tr,
.sources td {
  display: block;
}

.sources thead {
  display: none;
}

.sources tr {
  padding: 0.75rem 0;
}

.cell-use {
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
  color: var(--c-ink-mute);
}

.cell-name,
.cell-license {
  margin-top: 0.25rem;
}

@media (min-width: 640px) {
  .sources {
    display: table;
  }
  .sources thead {
    display: table-header-group;
  }
  .sources tbody {
    display: table-row-group;
  }
  .sources tr {
    display: table-row;
    padding: 0;
  }
  .sources td {
    display: table-cell;
  }

  .sources-detailed {
    table-layout: fixed;
  }
  .sources-detailed .col-use {
    width: 32%;
  }
  .sources-detailed .col-license {
    width: 12rem;
  }

  .sources th,
  .sources td {
    padding: 0.625rem 1rem 0.625rem 0;
  }
  .sources th {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
  .sources th:last-child,
  .sources td:last-child {
    padding-right: 0;
  }

  .cell-use {
    font-size: inherit;
    letter-spacing: normal;
    color: var(--c-ink-soft);
  }
  .cell-name,
  .cell-license {
    margin-top: 0;
    overflow-wrap: anywhere;
  }
}
</style>
