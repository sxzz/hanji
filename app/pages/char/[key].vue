<script setup lang="ts">
import { charOgPath, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '~~/shared/brand.ts'
import { dictGroups } from '~~/shared/links.ts'
import {
  fontRegionOf,
  glyphSignature,
  projectSignature,
  signatureIndexOf,
} from '~~/shared/row.ts'
import { strokeDataRef } from '~~/shared/strokes.ts'
import { REGIONS, type Column, type Region } from '~~/shared/types.ts'
import {
  charPath,
  morphName,
  rowsByKey,
  rowsNaming,
  useMorphingKey,
} from '~/composables/chars.ts'
import { dictionaryRegionsFor } from '~/locales/index.ts'
import {
  mergeStrokeOrderChoices,
  type StrokeOrderChoice,
} from '~/utils/animcjk.ts'
import { listPlace } from '~/utils/list-place.ts'

// char-alias sends the regional forms -- /char/国, /char/著 -- to the row they
// belong to, so only a character naming no row at all reaches the 404 below.
definePageMeta({ middleware: 'char-alias' })

const route = useRoute()
const { t, list, locale } = useT()
const { flagsOn, visibleColumns, visibleRegions } = usePrefs()
const siteUrl = useRuntimeConfig().public.siteUrl

const key = computed(() => decodeURIComponent(String(route.params.key)))
const row = computed(() => rowsByKey.get(key.value))

if (!row.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Character not found',
    fatal: true,
  })
}

const hex = (char: string) =>
  `U+${char.codePointAt(0)!.toString(16).toUpperCase()}`

/**
 * The columns this row offers: the five regions, and Japan's pre-reform form
 * where there is one. The kyujitai is compared alongside the rest rather than
 * noted underneath, because it is usually the very character Hong Kong and
 * Taiwan still write, and that reads off the table itself.
 *
 * A column the reader has switched off is not on offer at all -- it leaves no
 * cell to tick and no group to count, so what remains is partitioned among
 * itself.
 */
const columns = computed<Column[]>(() =>
  visibleColumns.value.filter((column) => column !== 'old' || row.value?.old),
)

/**
 * Columns taking part in the comparison. Clearing every box reads as no
 * narrowing at all rather than an empty page, so the comparison falls back to
 * all of them -- while the boxes stay cleared, because putting the ticks back
 * would be answering a different question than the reader asked.
 */
const picked = ref<Column[]>([...columns.value])
const hoveredGroup = ref<number>()
watch([key, columns], () => {
  picked.value = [...columns.value]
  hoveredGroup.value = undefined
})
const compared = computed(() =>
  picked.value.length ? picked.value : [...columns.value],
)

/**
 * Toggling reads the reader's own selection, never the all-columns fallback.
 * Reading the fallback made the first tick after clearing everything mean
 * "all but this one", which is the opposite of what the tick says -- and left
 * the box the browser had just ticked disagreeing with the state behind it.
 */
function toggle(group: Column[]) {
  const on = group.every((column) => picked.value.includes(column))
  picked.value = on
    ? picked.value.filter((column) => !group.includes(column))
    : columns.value.filter(
        (column) => group.includes(column) || picked.value.includes(column),
      )
}

/** Where the reader came from, so returning keeps their filters and place. */
const backTo = computed(() => listPlace.value?.fullPath ?? '/')

/**
 * Glyph groups renumbered over the columns on show, so the accents start at
 * the first one and the stack beside the table is colored the same way.
 */
const groups = computed(() =>
  projectSignature(
    glyphSignature(row.value!),
    columns.value.map(signatureIndexOf),
  ),
)

const cells = computed(() =>
  columns.value.map((column, position) => {
    const here = row.value!
    const group = Number(groups.value[position])
    if (column === 'old') {
      const old = here.old!
      return {
        column,
        char: old.char,
        // The kyujitai is Japan's own, so Japan's font draws it
        font: 'jp',
        lang: COLUMN_LANG.old,
        codePoint: hex(old.char),
        strokes: String(old.strokes || '—'),
        freq: old.freq ?? null,
        tier: 0,
        listing: undefined,
        group,
      }
    }
    const index = REGIONS.indexOf(column)
    return {
      column,
      char: here.chars[index]!,
      font: fontRegionOf(here, index),
      lang: COLUMN_LANG[column],
      codePoint: hex(here.chars[index]!),
      strokes: String(here.strokes[index] || '—'),
      freq: here.freq?.[index] ?? null,
      tier: here.tier[index]!,
      listing: here.listing[index]!,
      group,
    }
  }),
)

/** Distinct forms among the columns currently being compared. */
const variety = computed(
  () =>
    new Set(
      cells.value
        .filter((cell) => compared.value.includes(cell.column))
        .map((cell) => cell.group),
    ).size,
)

/** The wording follows the comparison rather than assuming every column. */
const summary = computed(() => {
  if (compared.value.length === 1) return t('char.onePicked')
  return variety.value === 1
    ? t('char.identical')
    : t('char.variety', { n: variety.value })
})

type Cell = (typeof cells.value)[number]

/**
 * Merge neighboring cells carrying the same value, one row at a time.
 *
 * The columns stay one per region: only the values decide what merges, so a
 * row like the listing level -- which genuinely differs region by region --
 * keeps its regional cells while the codepoint row collapses into one.
 */
function runs(keyOf: (cell: Cell) => string) {
  const out: { cell: Cell; span: number; from: number }[] = []
  for (const [index, cell] of cells.value.entries()) {
    const last = out.at(-1)
    if (last && keyOf(last.cell) === keyOf(cell)) last.span++
    else out.push({ cell, span: 1, from: index })
  }
  return out
}

const TIER_KEY: Record<string, string> = {
  cn: 'tierCn',
  hk: 'tierHk',
  tw: 'tierTw',
  jp: 'tierJp',
  kr: 'tierKr',
}
const tierLabel = (cell: Cell) => {
  if (cell.column === 'old') return '—'
  if (cell.listing === 'unlisted') return t('char.unlistedFallback')
  const label = t(`char.${TIER_KEY[cell.column]}.${cell.tier}`)
  return cell.listing === 'glossed' ? `${label} · ${t('char.glossed')}` : label
}

/** True when every column writes the character the same way. */
const singleForm = computed(
  () => new Set(cells.value.map((cell) => cell.group)).size === 1,
)

/** The character itself always merges: one form, drawn once. */
const charRuns = computed(() => runs((cell) => `${cell.char} ${cell.font}`))

/**
 * The header does not. With nothing to compare there is no checkbox and no
 * grouping to show, so each column keeps its own label -- the reader still
 * needs to see which places the one form covers.
 */
const headerRuns = computed(() =>
  singleForm.value
    ? cells.value.map((cell, from) => ({ cell, span: 1, from }))
    : charRuns.value,
)

/** The columns a merged run covers. */
const columnsOf = (run: { from: number; span: number }) =>
  columns.value.slice(run.from, run.from + run.span)

const headerControlPrefix = useId().replaceAll(':', '')
const headerControlId = (from: number) => `${headerControlPrefix}-${from}`
const columnLabel = (column: Column) =>
  column === 'old' ? t('region.old.full') : t(`region.${column}.full`)
const headerLabel = (run: { from: number; span: number }) =>
  columnsOf(run).map(columnLabel).join(' + ')

const columnRegion = (column: Column): Region =>
  column === 'old' ? 'jp' : column
const strokeChoices = computed<StrokeOrderChoice[]>(() => {
  const here = row.value!
  return mergeStrokeOrderChoices(
    here.key,
    cells.value.flatMap((cell) => {
      const data = strokeDataRef(here, cell.column)
      return data ? [{ column: cell.column, char: cell.char, data }] : []
    }),
  )
})
const codePointRuns = computed(() => runs((cell) => cell.codePoint))
const strokeRuns = computed(() => runs((cell) => cell.strokes))
const frequencyRuns = computed(() => runs((cell) => String(cell.freq ?? '')))
const tierRuns = computed(() => runs(tierLabel))
const readingRows = computed(() => {
  const readings = row.value?.readings
  if (!readings) return []
  return (['mandarin', 'cantonese', 'on', 'kun', 'korean'] as const)
    .map((kind) => ({ kind, values: readings[kind] ?? [] }))
    .filter((entry) => entry.values.length > 0)
})

/**
 * Every reading gets a cell of its own rather than one run-on line, so the
 * longest row sets the grid the shorter ones are read against.
 */
const readingCols = computed(() =>
  Math.max(1, ...readingRows.value.map((entry) => entry.values.length)),
)

/**
 * Characters that belong to two groups at once. Japan writes 缺 as 欠 and 罐 as
 * 缶, Taiwan writes 着 as 著 -- and 欠, 缶, 著 are all current characters with
 * groups of their own. Each side names the other rather than pretending it is
 * not there.
 */
const alsoSee = computed(() => {
  const here = row.value!
  const out: { key: string; text: string }[] = []
  const add = (key: string, text: string) => {
    if (key !== here.key && !out.some((seen) => seen.key === key))
      out.push({ key, text })
  }

  // A column of this row that heads a group of its own. Every one of these
  // names a region, so a region off the page has nothing to say here either.
  for (const region of visibleRegions.value) {
    const char = here.chars[REGIONS.indexOf(region)]!
    if (rowsByKey.has(char))
      add(char, t('char.alsoOut', { region: t(`region.${region}.full`), char }))
  }

  // Groups that write one of their columns with this row's key
  for (const other of rowsNaming(here.key)) {
    const index = other.chars.indexOf(here.key)
    const region = REGIONS[index]
    if (region && visibleRegions.value.includes(region))
      add(
        other.key,
        t('char.alsoIn', {
          char: other.key,
          region: t(`region.${region}.full`),
        }),
      )
  }

  // A deliberately unmerged relationship with only one region of evidence.
  // It is a navigation hint, not another searchable name for either row.
  const uncertain = new Map<
    string,
    { chars: Set<string>; regions: Set<(typeof REGIONS)[number]> }
  >()
  for (const relation of here.uncertain ?? []) {
    const evidence = relation.regions.filter((region) =>
      visibleRegions.value.includes(region),
    )
    if (evidence.length === 0) continue
    const group = uncertain.get(relation.key) ?? {
      chars: new Set<string>(),
      regions: new Set<(typeof REGIONS)[number]>(),
    }
    group.chars.add(relation.char)
    for (const region of evidence) group.regions.add(region)
    uncertain.set(relation.key, group)
  }
  for (const [related, relation] of uncertain)
    add(
      related,
      t('char.alsoUncertain', {
        char: list([...relation.chars], 'narrow'),
        region: list(
          [...relation.regions].map((region) => t(`region.${region}.full`)),
          'narrow',
        ),
      }),
    )
  return out
})

/** One row of references per character the group is written with. */
const dictionaryRegions = computed(() =>
  dictionaryRegionsFor(locale.value, visibleRegions.value),
)
const references = computed(() =>
  dictGroups(row.value!, {
    formRegions: visibleRegions.value,
    dictionaryRegions: dictionaryRegions.value,
  }),
)

/**
 * Receives the morph from the list. The name goes on whatever the thumbnail
 * grows into: the stack when there is something to compare, the single
 * character when all visible regions agree.
 *
 * It is left in place afterwards so going back animates in reverse.
 */
const morphing = useMorphingKey()
const morph = computed(() =>
  morphing.value?.key === key.value ? morphName(key.value) : undefined,
)

/**
 * A row has one address, the one keyed by its orthodox form. The regional
 * forms redirect here, and this says so for anything that reads the page
 * without following the redirect.
 */
useHead({
  link: () => [{ rel: 'canonical', href: charPath(row.value!.key) }],
})

const seoDescription = computed(
  () =>
    `${key.value} — ${list(
      cells.value.map(
        (c) => `${t(`region.${c.column}.full`)} ${c.char} ${c.codePoint}`,
      ),
      'narrow',
    )}`,
)
const pageUrl = computed(() => new URL(charPath(row.value!.key), siteUrl).href)
const ogImage = computed(
  () => new URL(charOgPath(row.value!.key), siteUrl).href,
)
const seoTitle = computed(() => `${key.value} · ${t('meta.title')}`)
const ogImageAlt = computed(() => `${key.value} 的中日港台四地字形叠印`)

useSeoMeta({
  title: () => key.value,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogImage,
  ogImageAlt,
  ogImageWidth: OG_IMAGE_WIDTH,
  ogImageHeight: OG_IMAGE_HEIGHT,
  ogType: 'article',
  ogUrl: pageUrl,
  ogSiteName: () => t('meta.title'),
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: ogImage,
  twitterImageAlt: ogImageAlt,
})
</script>

<template>
  <article v-if="row" class="flex flex-col gap-8 pb-6">
    <NuxtLink
      :to="backTo"
      class="focus-ring inline-flex items-center self-start gap-1.5 text-sm text-mute transition-colors duration-150 hover:text-ink"
    >
      <span class="i-ri-arrow-left-line block" />
      {{ t('nav.back') }}
    </NuxtLink>

    <!-- The character holds the left column for the whole page and stays put
         while the tables scroll past it. -->
    <div class="flex flex-col gap-10 md:flex-row md:items-start md:gap-12">
      <!-- Sticky under the nav rather than under the top of the viewport -->
      <div
        class="shrink-0 self-center md:sticky md:top-[calc(var(--nav-h)_+_2rem)] md:self-start"
      >
        <OverprintChar
          :row="row"
          :only="compared"
          :size="150"
          :morph="morph"
          :focus-group="hoveredGroup"
          morph-whole
          with-old
          scrub
        />
      </div>

      <div class="min-w-0 flex flex-1 flex-col gap-10">
        <section>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-left text-base">
              <thead>
                <tr class="border-b border-rule">
                  <th class="w-24 py-2 pr-4" />
                  <th
                    v-for="run in headerRuns"
                    :key="run.from"
                    :colspan="run.span"
                    class="border-l border-rule/40 py-2 text-center font-normal first:border-l-0"
                  >
                    <span
                      class="inline-flex items-center gap-1.5 text-xs text-soft sm:text-sm"
                    >
                      <input
                        v-if="!singleForm"
                        :id="headerControlId(run.from)"
                        type="checkbox"
                        class="focus-ring size-3.5 accent-$c-g2"
                        :checked="picked.includes(run.cell.column)"
                        :aria-label="headerLabel(run)"
                        @change="toggle(columnsOf(run))"
                      />
                      <template v-for="column in columnsOf(run)" :key="column">
                        <OldFormHelp v-if="column === 'old'" />
                        <label
                          v-else-if="!singleForm"
                          :for="headerControlId(run.from)"
                          class="inline-flex cursor-pointer items-center"
                          :title="t(`region.${column}.full`)"
                        >
                          <RegionLabel
                            :flag="flagsOn"
                            :region="columnRegion(column)"
                          />
                        </label>
                        <span
                          v-else
                          class="inline-flex items-center"
                          :title="t(`region.${column}.full`)"
                        >
                          <RegionLabel
                            :flag="flagsOn"
                            :region="columnRegion(column)"
                          />
                        </span>
                      </template>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody class="text-soft">
                <tr>
                  <th class="py-4 pr-4" />
                  <td
                    v-for="run in charRuns"
                    :key="run.from"
                    :colspan="run.span"
                    class="border-l border-rule/40 py-4 text-center transition-opacity duration-150 first:border-l-0"
                    :class="
                      compared.includes(run.cell.column) ? '' : 'opacity-20'
                    "
                    @mouseenter="hoveredGroup = run.cell.group"
                    @mouseleave="hoveredGroup = undefined"
                  >
                    <span
                      :lang="run.cell.lang"
                      :class="`hanji-${run.cell.font}`"
                      class="text-[4rem] leading-none sm:text-[5rem]"
                      >{{ run.cell.char }}</span
                    >
                  </td>
                </tr>
                <tr class="border-b border-rule/60">
                  <th class="py-3 pr-4 text-left eyebrow font-normal">
                    {{ t('char.codePoint') }}
                  </th>
                  <td
                    v-for="run in codePointRuns"
                    :key="run.from"
                    :colspan="run.span"
                    class="tabular border-l border-rule/40 py-3 text-center text-sm font-mono first:border-l-0"
                  >
                    {{ run.cell.codePoint }}
                  </td>
                </tr>
                <tr class="border-b border-rule/60">
                  <th class="py-3 pr-4 text-left eyebrow font-normal">
                    {{ t('char.strokes') }}
                  </th>
                  <td
                    v-for="run in strokeRuns"
                    :key="run.from"
                    :colspan="run.span"
                    class="tabular border-l border-rule/40 py-3 text-center text-sm font-mono first:border-l-0"
                  >
                    {{ run.cell.strokes }}
                  </td>
                </tr>
                <tr class="border-b border-rule/60">
                  <th class="py-3 pr-4 text-left eyebrow font-normal">
                    {{ t('char.freq') }}
                  </th>
                  <td
                    v-for="run in frequencyRuns"
                    :key="run.from"
                    :colspan="run.span"
                    class="tabular border-l border-rule/40 py-3 text-center text-sm text-mute font-mono first:border-l-0"
                  >
                    <template v-if="run.cell.freq !== null">
                      #{{ run.cell.freq.toLocaleString() }}
                    </template>
                    <template v-else>—</template>
                  </td>
                </tr>
                <tr>
                  <th class="py-3 pr-4 text-left eyebrow font-normal">
                    {{ t('char.listed') }}
                  </th>
                  <td
                    v-for="run in tierRuns"
                    :key="run.from"
                    :colspan="run.span"
                    class="border-l border-rule/40 py-3 text-center text-xs first:border-l-0 sm:text-sm"
                  >
                    {{ tierLabel(run.cell) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-4 text-center text-sm text-soft">{{ summary }}</p>
        </section>

        <section
          v-if="readingRows.length || alsoSee.length"
          class="overflow-x-auto"
        >
          <table class="w-full border-collapse text-left text-base">
            <tbody>
              <tr
                v-for="entry in readingRows"
                :key="entry.kind"
                class="border-b border-rule/60"
              >
                <th
                  class="w-24 whitespace-nowrap py-2.5 pr-4 text-left eyebrow font-normal"
                >
                  {{ t(`char.${entry.kind}`) }}
                </th>
                <td
                  v-for="(reading, index) in entry.values"
                  :key="index"
                  class="whitespace-nowrap border-l border-rule/40 px-3 py-2.5 text-center text-soft"
                  :lang="
                    entry.kind === 'korean'
                      ? 'ko'
                      : entry.kind === 'on' || entry.kind === 'kun'
                        ? 'ja'
                        : undefined
                  "
                >
                  {{ reading }}
                </td>
                <!-- Pad the short rows so every row ends on the same edge -->
                <td
                  v-if="entry.values.length < readingCols"
                  :colspan="readingCols - entry.values.length"
                  class="border-l border-rule/40"
                />
              </tr>
              <tr v-if="alsoSee.length" class="border-b border-rule/60">
                <th
                  class="w-24 whitespace-nowrap py-2.5 pr-4 text-left align-middle eyebrow font-normal"
                >
                  {{ t('char.also') }}
                </th>
                <td
                  :colspan="readingCols"
                  class="border-l border-rule/40 px-3 py-2.5"
                >
                  <span class="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <NuxtLink
                      v-for="entry in alsoSee"
                      :key="entry.key"
                      :to="charPath(entry.key)"
                      class="focus-ring inline-flex items-baseline gap-2 text-sm text-soft transition-colors duration-150 hover:text-ink"
                    >
                      <span class="hanji-cn text-2xl leading-none">{{
                        entry.key
                      }}</span>
                      {{ entry.text }}
                    </NuxtLink>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <StrokeOrder :choices="strokeChoices" />

        <section class="flex flex-col gap-6">
          <span class="eyebrow">{{ t('char.dict') }}</span>
          <!-- One line per character the group is written with; a group with
               a single character needs no heading to tell them apart. -->
          <div
            v-for="group in references"
            :key="group.form.char"
            class="flex flex-col gap-2.5"
          >
            <span
              v-if="references.length > 1"
              :lang="COLUMN_LANG[group.form.font]"
              :class="`hanji-${group.form.font}`"
              class="text-2xl text-mute leading-none"
              >{{ group.form.char }}</span
            >
            <ul class="flex flex-wrap gap-2">
              <li v-for="link in group.links" :key="link.id">
                <a
                  :href="link.url"
                  target="_blank"
                  rel="noreferrer"
                  class="focus-ring inline-flex items-center gap-1.5 border border-rule rounded-md px-3 py-2 text-base text-soft transition-colors duration-150 hover:border-ink/30 hover:text-ink"
                >
                  <span v-if="link.region" class="eyebrow"
                    ><RegionLabel :flag="flagsOn" :region="link.region" />
                  </span>
                  <span
                    v-else-if="link.icon"
                    :class="link.icon"
                    class="block"
                  />
                  {{ link.name }}
                  <span
                    class="i-ri-external-link-line block text-xs opacity-50"
                  />
                </a>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  </article>
</template>
