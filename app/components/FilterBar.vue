<script setup lang="ts">
import { listingOptionsFor } from '~~/shared/listings.ts'
import {
  injectChars,
  type Dimension,
  type SortKey,
} from '~/composables/chars.ts'

const chars = injectChars()
const { t } = useT()
const { regionLabel, labelClass, visibleColumns, visibleRegions } = usePrefs()

// Every label has to be computed, not built once: t() reads the active locale
// and the reader can change it after the component is set up
const dimensions = computed<
  { value: Dimension; label: string; title: string }[]
>(() => [
  { value: 'glyph', label: t('filter.glyph'), title: t('filter.glyphHint') },
  { value: 'cp', label: t('filter.cp'), title: t('filter.cpHint') },
])

const sorts = computed<{ value: SortKey; label: string }[]>(() =>
  (['common', 'strokes', 'cp', 'freq'] as const).map((value) => ({
    value,
    label: t(`sort.${value}`),
  })),
)

/** Only show patterns that actually occur in the chosen dimension. */
const varieties = computed(() =>
  chars.patternGroups.value
    .map(({ variety, patterns }) => ({
      variety,
      label:
        variety === 1
          ? t('filter.identical', { n: hanNumber(visibleRegions.value.length) })
          : t('filter.variety', { n: variety }),
      patterns: patterns.filter((p) => p in chars.counts.value),
    }))
    .filter((group) => group.patterns.length > 0),
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
  <div class="flex flex-col gap-3 text-sm">
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
      <label class="flex items-center gap-3">
        <span class="w-20 shrink-0 eyebrow">{{ t('filter.dimension') }}</span>
        <SegChoice v-model="chars.dimension.value" :options="dimensions" />
      </label>

      <label class="flex items-center gap-2">
        <span class="eyebrow">{{ t('sort.label') }}</span>
        <SegChoice v-model="chars.sortKey.value" :options="sorts" />
      </label>

      <span class="tabular ml-auto text-xs text-mute font-mono">
        {{
          t('filter.matched', { n: chars.rows.value.length.toLocaleString() })
        }}
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
      <label class="flex items-center gap-3">
        <span class="w-20 shrink-0 eyebrow">{{ t('filter.search') }}</span>
        <input
          v-model="chars.query.value"
          type="search"
          class="h-7 w-52 border border-rule rounded-md bg-sunk px-2.5 text-sm placeholder:text-mute focus-ring"
          :placeholder="t('filter.searchPlaceholder')"
        />
      </label>

      <label class="flex items-center gap-2">
        <span class="eyebrow">{{ t('filter.strokes') }}</span>
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
      </label>

      <div class="flex items-center gap-2">
        <span class="eyebrow">{{ t('filter.common') }}</span>
        <div class="flex gap-1">
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
            <span :class="labelClass">{{ regionLabel(region) }}</span>
          </button>
        </div>
      </div>

      <button
        v-if="chars.dirty.value"
        type="button"
        class="ml-auto text-xs text-mute underline-offset-4 hover:text-ink hover:underline focus-ring"
        @click="chars.reset()"
      >
        {{ t('filter.clear') }}
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span class="w-20 shrink-0 eyebrow">{{ t('filter.tier') }}</span>
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
        <span class="opacity-60" :class="labelClass">{{
          regionLabel(option.region)
        }}</span>
        {{ option.label }}
      </button>
    </div>

    <!--
      Every partition the columns on show can describe -- fifteen of them for
      four columns, five for three -- grouped by how many distinct forms each
      one names. The chip is the same run graphic used under the cells, so no
      wording is needed: "CN+HK | TW | JP" reads slower than seeing three runs.
    -->
    <div class="flex flex-col gap-2">
      <div
        v-for="group in varieties"
        :key="group.variety"
        class="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-x-3"
      >
        <span class="h-7 flex items-center eyebrow">{{ group.label }}</span>
        <div class="flex flex-wrap items-center gap-1.5">
          <PatternChip
            v-for="signature in group.patterns"
            :key="signature"
            :signature="signature"
            :count="chars.counts.value[signature] ?? 0"
            :active="chars.patterns.value.includes(signature)"
            @toggle="chars.togglePattern(signature)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
