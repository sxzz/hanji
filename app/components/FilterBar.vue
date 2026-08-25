<script setup lang="ts">
import { listingOptionsFor } from '~~/shared/listings.ts'
import { varietyChoice } from '~~/shared/patterns.ts'
import { FREQUENCY_REGIONS, REGIONS } from '~~/shared/types.ts'
import {
  injectChars,
  SORT_KEYS,
  type Dimension,
  type SortKey,
} from '~/composables/chars.ts'

const chars = injectChars()
const { t, list, number, locale } = useT()
const { flagsOn, visibleColumns, visibleRegions } = usePrefs()

// Every label has to be computed, not built once: t() reads the active locale
// and the reader can change it after the component is set up
const dimensions = computed<
  { value: Dimension; label: string; title: string }[]
>(() => [
  { value: 'glyph', label: t('filter.glyph'), title: t('filter.glyphHint') },
  { value: 'cp', label: t('filter.cp'), title: t('filter.cpHint') },
])

const sorts = computed(() =>
  SORT_KEYS.map((value) => {
    const label = t(`sort.${value}`)
    const active = chars.sortKey.value === value
    const direction = t(`sort.${chars.order.value}`)
    return {
      value,
      label,
      suffix: active ? (chars.order.value === 'asc' ? '↑' : '↓') : undefined,
      title: active ? `${label} · ${direction}` : undefined,
      ariaLabel: active ? list([label, direction]) : label,
    }
  }),
)

const sortModel = computed<SortKey>({
  get: () => chars.sortKey.value,
  set: (value) => {
    chars.sortKey.value = value
    chars.order.value = 'asc'
  },
})

function reverseSort() {
  chars.order.value = chars.order.value === 'asc' ? 'desc' : 'asc'
}

const frequencyRegions = computed(() =>
  FREQUENCY_REGIONS.map((region) => ({
    value: region,
    parts: [{ region }],
    title: t(`region.${region}.full`),
  })),
)

const strokeRegions = computed(() =>
  REGIONS.map((region) => ({
    value: region,
    parts: [{ region }],
    title: t(`region.${region}.full`),
  })),
)

/** Read a partition as “Mainland+Taiwan | Hong Kong+Japan”. */
function patternLabel(signature: string): string {
  const groups = new Map<string, string[]>()
  for (const [index, group] of [...signature].entries()) {
    const region = visibleRegions.value[index]
    if (!region) continue
    groups.set(group, [
      ...(groups.get(group) ?? []),
      t(`region.${region}.full`),
    ])
  }
  const partition = [...groups.values()]
    .map((regions) => regions.join('+'))
    .join(' | ')
  return `${partition} · ${t('filter.matched', {
    n: number(chars.counts.value[signature] ?? 0),
  })}`
}

/**
 * Zero-count choices normally stay out of the way, except when selected: an
 * active choice must remain on screen so the reader can always turn it off.
 */
const varieties = computed(() => {
  const selected = new Set(chars.patterns.value)
  return chars.patternGroups.value
    .map(({ variety, patterns: allPatterns }) => {
      const broad = varietyChoice(variety)
      const active = selected.has(broad)
      const partial =
        !active && allPatterns.some((pattern) => selected.has(pattern))
      const patterns = allPatterns.filter(
        (pattern) =>
          (allPatterns.length > 1 && pattern in chars.counts.value) ||
          selected.has(pattern),
      )
      return {
        variety,
        label:
          variety === 1
            ? t('filter.identical', {
                n: hanNumber(visibleRegions.value.length, locale.value),
              })
            : t('filter.variety', {
                n: hanNumber(variety, locale.value),
              }),
        count: allPatterns.reduce(
          (total, pattern) => total + (chars.counts.value[pattern] ?? 0),
          0,
        ),
        active,
        partial,
        patterns,
        allPatterns,
      }
    })
    .filter((group) => group.count > 0 || group.active || group.partial)
})

const exactPatterns = computed(() =>
  varieties.value.flatMap((group) => group.patterns),
)

const [lo, hi] = chars.strokeBounds
const strokeLow = computed({
  get: () => chars.strokes.value[0],
  set: (value: number) =>
    (chars.strokes.value = [
      Math.min(Math.max(value || lo, lo), chars.strokes.value[1]),
      chars.strokes.value[1],
    ]),
})
const strokeHigh = computed({
  get: () => chars.strokes.value[1],
  set: (value: number) =>
    (chars.strokes.value = [
      chars.strokes.value[0],
      Math.max(Math.min(value || hi, hi), chars.strokes.value[0]),
    ]),
})

/** Tier labels live under char.tierCn and friends; old forms use region.old. */
const listingOptions = computed(() =>
  listingOptionsFor(visibleColumns.value).map((entry) => {
    const oldFull = t('region.old.full')
    const japanFull = t('region.jp.full')
    const oldRemainder = oldFull.slice(japanFull.length)
    // Do not treat an English adjective such as "Japanese" as the region
    // name "Japan" followed by a suffix.
    const oldFlagSuffix =
      oldFull.startsWith(japanFull) && !/^[a-z]/i.test(oldRemainder)
        ? oldRemainder.trimStart()
        : undefined
    const label =
      entry.kind === 'old'
        ? oldFull
        : t(
            `char.tier${entry.region[0]!.toUpperCase()}${entry.region[1]}.${entry.tier}`,
          )
    const title =
      entry.kind === 'old'
        ? t('region.old.full')
        : t(`region.${entry.region}.full`)
    return {
      ...entry,
      label,
      title,
      ariaLabel: entry.kind === 'old' ? title : `${title} ${label}`,
      parts:
        entry.kind === 'old'
          ? flagsOn.value && oldFlagSuffix
            ? [{ region: entry.region, suffix: oldFlagSuffix }]
            : [{ suffix: oldFull }]
          : [{ region: entry.region, suffix: label }],
    }
  }),
)

function toggleTier(id: string) {
  const chosen = new Set(chars.tiers.value)
  if (chosen.has(id)) chosen.delete(id)
  else chosen.add(id)
  chars.tiers.value = [...chosen]
}

function toggleRegion(region: string) {
  const chosen = new Set(chars.common.value)
  if (chosen.has(region)) chosen.delete(region)
  else chosen.add(region)
  chars.common.value = [...chosen]
}
</script>

<template>
  <div class="filter-form text-sm">
    <div class="filter-line">
      <span
        role="status"
        class="filter-count tabular text-xs text-mute font-mono"
      >
        {{ t('filter.matched', { n: number(chars.rows.value.length) }) }}
      </span>

      <label class="filter-field">
        <span class="filter-label eyebrow">{{ t('filter.search') }}</span>
        <input
          v-model="chars.query.value"
          type="search"
          class="filter-control focus-ring h-7 w-full border border-rule rounded-md bg-sunk px-2.5 text-sm sm:w-52 placeholder:text-mute"
          :placeholder="t('filter.searchPlaceholder')"
        />
      </label>

      <div class="filter-field">
        <span class="filter-label eyebrow">{{ t('filter.strokes') }}</span>
        <div class="filter-control flex flex-wrap items-center gap-1.5">
          <RegionChoice
            v-model="chars.strokeRegion.value"
            :group-label="t('filter.strokes')"
            :options="strokeRegions"
          />
          <span class="flex shrink-0 items-center gap-2">
            <input
              v-model.number="strokeLow"
              type="number"
              :min="lo"
              :max="hi"
              :aria-label="t('filter.strokeMin')"
              class="tabular focus-ring h-7 w-14 border border-rule rounded-md bg-sunk px-2 text-center text-xs font-mono"
            />
            <span class="text-mute">–</span>
            <input
              v-model.number="strokeHigh"
              type="number"
              :min="lo"
              :max="hi"
              :aria-label="t('filter.strokeMax')"
              class="tabular focus-ring h-7 w-14 border border-rule rounded-md bg-sunk px-2 text-center text-xs font-mono"
            />
          </span>
        </div>
      </div>
    </div>

    <div class="filter-line">
      <div class="filter-field">
        <span class="filter-label eyebrow">{{ t('filter.common') }}</span>
        <div class="filter-control flex gap-1">
          <RegionOption
            v-for="region in visibleRegions"
            :key="region"
            :active="chars.common.value.includes(region)"
            :label="t(`region.${region}.full`)"
            :parts="[{ region }]"
            @select="toggleRegion(region)"
          />
        </div>
      </div>

      <div class="filter-field">
        <span class="filter-label eyebrow">{{ t('sort.label') }}</span>
        <span class="filter-control flex items-center gap-1.5">
          <SegChoice
            v-model="sortModel"
            :options="sorts"
            @repeat="reverseSort"
          />
          <!-- Frequency needs its own regional corpus choice. Stroke sorting
               reuses the always-visible region beside the stroke range. -->
          <RegionChoice
            v-if="chars.sortKey.value === 'freq'"
            v-model="chars.freqRegion.value"
            :group-label="t('sort.freqRegion')"
            :options="frequencyRegions"
          />
        </span>
      </div>

      <button
        v-if="chars.dirty.value"
        type="button"
        class="filter-clear focus-ring text-xs text-mute underline-offset-4 hover:text-ink hover:underline"
        @click="chars.reset()"
      >
        {{ t('filter.clear') }}
      </button>
    </div>

    <div class="filter-field filter-field-start">
      <span class="filter-label h-7 flex items-center eyebrow">{{
        t('filter.tier')
      }}</span>
      <div class="filter-control flex flex-wrap items-center gap-x-3 gap-y-2">
        <RegionOption
          v-for="option in listingOptions"
          :key="option.id"
          :active="chars.tiers.value.includes(option.id)"
          :label="option.ariaLabel"
          :parts="option.parts"
          :title="option.title"
          @select="toggleTier(option.id)"
        />
      </div>
    </div>

    <div class="filter-field">
      <span class="filter-label eyebrow">{{ t('filter.dimension') }}</span>
      <div class="filter-control">
        <SegChoice v-model="chars.dimension.value" :options="dimensions" />
      </div>
    </div>

    <!--
      Every partition the columns on show can describe -- fifteen of them for
      four columns, five for three. Broad “N forms” choices share the first row;
      exact regional partitions share the second so either level scans as one
      set instead of several separate groups.
    -->
    <div class="filter-field filter-field-start">
      <span class="filter-label h-7 flex items-center eyebrow">{{
        t('filter.pattern')
      }}</span>
      <div class="filter-control flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-1.5">
          <VarietyChip
            v-for="group in varieties"
            :key="group.variety"
            :label="group.label"
            :count="group.count"
            :active="group.active"
            :partial="group.partial"
            @toggle="chars.toggleVariety(group.variety, group.allPatterns)"
          />
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          <PatternChip
            v-for="signature in exactPatterns"
            :key="signature"
            :signature="signature"
            :count="chars.counts.value[signature] ?? 0"
            :active="chars.patterns.value.includes(signature)"
            :label="patternLabel(signature)"
            @toggle="chars.togglePattern(signature)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * One layout system the whole way down: every level here is flex, so a field
 * behaves the same whether it stands on its own row or shares one.
 *
 * A field is a label and its control side by side. Every field that opens a row
 * gives its label a fixed width, so the controls down the left edge -- search,
 * common, listed, dimension, pattern -- all start on the same line. Only a
 * field that joins a row already opened by another takes just the width of its
 * word: it has nothing above or below it to line up with.
 */
.filter-form {
  --filter-label-width: 4.5rem;
  --filter-column-gap: 0.5rem;

  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-line {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-field {
  display: flex;
  min-width: 0;
  align-items: center;
  column-gap: var(--filter-column-gap);
}

.filter-field-start {
  align-items: flex-start;
}

.filter-label {
  flex: none;
  width: var(--filter-label-width);
}

.filter-control {
  min-width: 0;
  flex: 1;
}

.filter-count {
  order: -1;
  align-self: flex-end;
}

.filter-clear {
  align-self: flex-end;
}

@media (min-width: 640px) {
  .filter-form {
    --filter-label-width: 5rem;
    --filter-column-gap: 0.75rem;
  }

  .filter-line {
    flex-flow: row wrap;
    align-items: center;
    column-gap: 1.25rem;
  }

  .filter-line .filter-field,
  .filter-line .filter-control {
    flex: none;
  }

  .filter-count {
    order: 1;
    align-self: auto;
    margin-left: auto;
  }

  .filter-clear {
    align-self: auto;
    margin-left: auto;
  }
}

/* The complete search row, including its result count, first fits at 46rem.
   Below that width a later field can wrap, so every field keeps the shared
   label column. Once the row fits, inline labels can shrink to their copy. */
@media (min-width: 46rem) {
  .filter-line .filter-field ~ .filter-field .filter-label {
    width: auto;
  }
}
</style>
