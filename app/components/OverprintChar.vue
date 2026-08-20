<script setup lang="ts">
import {
  fontRegionOf,
  glyphSignature,
  projectSignature,
  signatureIndexOf,
} from '~~/shared/row.ts'
import {
  REGIONS,
  type CharRow,
  type Column,
  type Region,
} from '~~/shared/types.ts'

const props = withDefaults(
  defineProps<{
    row: CharRow
    /** Font size in px, or any CSS length. */
    size?: number | string
    /**
     * A view-transition-name. It prefixes one name per layer unless
     * `morphWhole` names the stack as one for a route transition.
     */
    morph?: string
    morphWhole?: boolean
    /** Columns to stack; omit to take every one on offer. */
    only?: readonly Column[]
    /** Include Japan's pre-reform form, which the detail page compares too. */
    withOld?: boolean
    /** Keep this glyph group vivid and veil the other overprint layers. */
    focusGroup?: number
  }>(),
  {
    size: 32,
    morph: undefined,
    only: undefined,
    withOld: false,
    focusGroup: undefined,
  },
)

const { list } = useT()
const { outlineOn, visibleColumns, visibleRegions } = usePrefs()

/**
 * The columns this stack is numbered against: everything the reader keeps on
 * show that the row actually has. `only` narrows what gets drawn but not the
 * numbering, so the colors still line up with a table showing every column.
 */
const basis = computed(() =>
  (props.withOld ? visibleColumns.value : visibleRegions.value).filter(
    (column) => column !== 'old' || props.row.old,
  ),
)

/** Group per basis column, renumbered over the columns on show. */
const groups = computed(() =>
  projectSignature(
    glyphSignature(props.row),
    basis.value.map(signatureIndexOf),
  ),
)

/**
 * One layer per group, not per region. Regions in a group draw the identical
 * shape, so stacking them twice would just make that group darker than the
 * others and misrepresent the balance.
 */
const layers = computed(() => {
  const seen = new Map<
    number,
    { char: string; region: string; group: number }
  >()
  for (const [position, column] of basis.value.entries()) {
    if (props.only && !props.only.includes(column)) continue
    const group = Number(groups.value[position])
    if (seen.has(group)) continue
    if (column === 'old') {
      // The kyujitai is Japan's own, so Japan's font draws it
      seen.set(group, { char: props.row.old!.char, region: 'jp', group })
      continue
    }
    const index = REGIONS.indexOf(column as Region)
    const char = props.row.chars[index]
    if (!char) continue
    seen.set(group, { char, region: fontRegionOf(props.row, index), group })
  }
  return [...seen.values()]
})
/** Read aloud in place of the stack, so the forms are enumerated for a locale
 * rather than punctuated by hand. */
const label = computed(() =>
  list(
    layers.value.map((l) => l.char),
    'narrow',
  ),
)

/**
 * Color encodes which group a layer belongs to, so with a single group it
 * would encode nothing while shouting loudest. Uniform characters are drawn in
 * ink: no disagreement, no color.
 */
const colorOf = (group: number) =>
  layers.value.length === 1 ? 'var(--c-ink)' : `var(--c-g${group + 1})`

/** Ignore a focus request for a layer hidden by the current comparison. */
const activeFocus = computed(() =>
  props.focusGroup !== undefined &&
  layers.value.some((layer) => layer.group === props.focusGroup)
    ? props.focusGroup
    : undefined,
)
</script>

<template>
  <!--
    isolation keeps the layers blending with each other rather than with the
    row behind them: the first layer lands on a transparent backdrop, where
    multiply resolves to the source color, and only later layers multiply into
    what has accumulated. So "shared strokes go ink-black, disagreements show
    color" holds on any background.
  -->
  <span
    class="overprint"
    :class="{ outlined: outlineOn }"
    :style="{
      '--size': typeof size === 'number' ? `${size}px` : size,
      viewTransitionName: morph && morphWhole ? morph : undefined,
    }"
    :title="label"
    :aria-label="label"
    role="img"
  >
    <span
      v-for="layer in layers"
      :key="layer.group"
      class="layer"
      :class="[
        `hanji-${layer.region}`,
        { veiled: activeFocus !== undefined && layer.group !== activeFocus },
      ]"
      :style="{
        '--layer-color': colorOf(layer.group),
        viewTransitionName:
          morph && !morphWhole ? `${morph}-${layer.group}` : undefined,
      }"
      aria-hidden="true"
      >{{ layer.char }}</span
    >
  </span>
</template>

<style scoped>
.overprint {
  position: relative;
  display: inline-grid;
  isolation: isolate;
  width: var(--size);
  height: var(--size);
  font-size: var(--size);
  line-height: 1;
}

.layer {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--layer-color);
  mix-blend-mode: var(--overprint-blend);
  transition: opacity 180ms ease;
}

.layer.veiled {
  opacity: 0.16;
}

/* Hollow: the color moves from the fill to the stroke, so the shapes read
   through one another instead of stacking into a single mass. The floor keeps
   the stroke visible on the row thumbnails, where an em is only 32px. */
.outlined .layer {
  color: transparent;
  -webkit-text-stroke: max(0.6px, 0.014em) var(--layer-color);
}
</style>
