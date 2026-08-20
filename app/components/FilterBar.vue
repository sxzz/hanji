<script setup lang="ts">
import { listingOptionsFor } from '~~/shared/listings.ts'
import { varietyChoice } from '~~/shared/patterns.ts'
import {
  injectChars,
  type Dimension,
  type SortKey,
} from '~/composables/chars.ts'

const chars = injectChars()
const { t, locale } = useT()
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
  (['common', 'strokes', 'cp', 'freq'] as const).map((value) => {
    const label = t(`sort.${value}`)
    const active = chars.sortKey.value === value
    const direction = t(`sort.${chars.order.value}`)
    return {
      value,
      label,
      suffix: active ? (chars.order.value === 'asc' ? '↑' : '↓') : undefined,
      title: active ? `${label} · ${direction}` : undefined,
      ariaLabel: active ? `${label}，${direction}` : label,
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
    n: (chars.counts.value[signature] ?? 0).toLocaleString(),
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
  listingOptionsFor(visibleColumns.value).map((entry) => ({
    ...entry,
    label:
      entry.kind === 'old'
        ? t('region.old.short')
        : t(
            `char.tier${entry.region[0]!.toUpperCase()}${entry.region[1]}.${entry.tier}`,
          ),
    title:
      entry.kind === 'old'
        ? t('region.old.full')
        : t(`region.${entry.region}.full`),
  })),
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
      <span class="filter-count tabular text-xs text-mute font-mono">
        {{
          t('filter.matched', { n: chars.rows.value.length.toLocaleString() })
        }}
      </span>

      <label class="filter-field filter-search">
        <span class="filter-label eyebrow">{{ t('filter.search') }}</span>
        <input
          v-model="chars.query.value"
          type="search"
          class="filter-control h-7 w-full border border-rule rounded-md bg-sunk px-2.5 text-sm sm:w-52 placeholder:text-mute focus-ring"
          :placeholder="t('filter.searchPlaceholder')"
        />
      </label>

      <label class="filter-field">
        <span class="filter-label eyebrow">{{ t('filter.strokes') }}</span>
        <span class="filter-control flex items-center gap-2">
          <input
            v-model.number="strokeLow"
            type="number"
            :min="lo"
            :max="hi"
            class="tabular h-7 w-14 border border-rule rounded-md bg-sunk px-2 text-center text-xs font-mono focus-ring"
          />
          <span class="text-mute">–</span>
          <input
            v-model.number="strokeHigh"
            type="number"
            :min="lo"
            :max="hi"
            class="tabular h-7 w-14 border border-rule rounded-md bg-sunk px-2 text-center text-xs font-mono focus-ring"
          />
        </span>
      </label>
    </div>

    <div class="filter-line">
      <div class="filter-field">
        <span class="filter-label eyebrow">{{ t('filter.common') }}</span>
        <div class="filter-control flex gap-1">
          <button
            v-for="region in visibleRegions"
            :key="region"
            type="button"
            class="size-7 border rounded-md text-xs transition-colors duration-150 focus-ring"
            :class="
              chars.common.value.includes(region)
                ? 'border-$c-ink bg-$c-ink text-$c-paper'
                : 'border-rule bg-paper text-mute hover:border-ink/30'
            "
            :title="t(`region.${region}.full`)"
            :aria-pressed="chars.common.value.includes(region)"
            @click="toggleRegion(region)"
          >
            <RegionLabel :flag="flagsOn" :region="region" />
          </button>
        </div>
      </div>

      <div class="filter-field">
        <span class="filter-label eyebrow">{{ t('sort.label') }}</span>
        <span class="filter-control">
          <SegChoice
            v-model="sortModel"
            class="w-full sm:w-auto"
            :options="sorts"
            @repeat="reverseSort"
          />
        </span>
      </div>

      <button
        v-if="chars.dirty.value"
        type="button"
        class="filter-clear text-xs text-mute underline-offset-4 hover:text-ink hover:underline focus-ring"
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
        <button
          v-for="option in listingOptions"
          :key="option.id"
          type="button"
          class="h-7 flex items-center gap-1.5 border rounded-md px-2 text-xs transition-colors duration-150 focus-ring"
          :class="
            chars.tiers.value.includes(option.id)
              ? 'border-$c-ink bg-$c-ink text-$c-paper'
              : 'border-rule bg-paper text-soft hover:border-ink/30'
          "
          :title="option.title"
          :aria-pressed="chars.tiers.value.includes(option.id)"
          @click="toggleTier(option.id)"
        >
          <RegionLabel
            :flag="flagsOn"
            :region="option.region"
            class="opacity-60"
          />
          {{ option.label }}
        </button>
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
  display: grid;
  min-width: 0;
  width: 100%;
  grid-template-columns: var(--filter-label-width) minmax(0, 1fr);
  align-items: center;
  column-gap: var(--filter-column-gap);
}

.filter-field-start {
  align-items: start;
}

.filter-label {
  grid-column: 1;
  min-width: 0;
}

.filter-control {
  grid-column: 2;
  min-width: 0;
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

  .filter-line .filter-field {
    width: auto;
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
</style>
