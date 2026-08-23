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
import { overprintColor, overprintOpacity } from '~/utils/overprint.ts'

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
    /** Keep this glyph group vivid and hold the other overprint layers back. */
    focusGroup?: number
    /** Answer to a resting pointer by fanning and walking the forms. */
    interactive?: boolean
    /** Let a press-and-drag pull the layers out of register by hand. */
    scrub?: boolean
  }>(),
  {
    size: 32,
    morph: undefined,
    only: undefined,
    withOld: false,
    focusGroup: undefined,
    interactive: true,
    scrub: false,
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

const drawnColumns = computed(() =>
  basis.value.filter((column) => !props.only || props.only.includes(column)),
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

/** One shared opacity for every visible shape; dense rows get more air. */
const plateOpacity = computed(() =>
  layers.value.length === 1
    ? 1
    : overprintOpacity(props.row, drawnColumns.value),
)

/**
 * Read aloud in place of the stack, so the forms are enumerated for a locale
 * rather than punctuated by hand.
 *
 * Deliberately not a `title` as well. The browser's own tooltip opens right
 * where the pointer is resting, which is exactly over the stack it would be
 * describing -- so it covered the walk through the forms, which answers the
 * same question far better than a line of text ever did.
 */
const label = computed(() =>
  list(
    layers.value.map((l) => l.char),
    'narrow',
  ),
)

/**
 * Color encodes shapes within this stack in one fixed five-ink sequence. A
 * uniform character has nothing to distinguish and remains ordinary ink.
 */
const colorOf = (group: number) =>
  layers.value.length === 1 ? 'var(--c-ink)' : overprintColor(group)

const cycle = useOverprintCycle(
  () => layers.value.map((layer) => layer.group),
  { enabled: () => props.interactive, scrub: () => props.scrub },
)

/**
 * A group the page has pinned -- a reader hovering one cell of the comparison
 * table -- outranks the stack's own walk through the forms.
 */
const focused = computed(() => props.focusGroup ?? cycle.lit.value)

/**
 * Columns writing the form the walk has lit, for the label under the stack.
 *
 * Only the walk gets one. A group pinned from outside -- a reader hovering one
 * cell of the comparison table -- is already under their pointer, and naming
 * it back to them would say nothing they did not just do.
 */
const litColumns = computed(() => {
  const group = cycle.lit.value
  if (group === undefined) return []
  return basis.value.filter(
    (column, position) =>
      Number(groups.value[position]) === group &&
      (!props.only || props.only.includes(column)),
  )
})

/** Ignore a focus request for a layer hidden by the current comparison. */
const activeFocus = computed(() =>
  focused.value !== undefined &&
  layers.value.some((layer) => layer.group === focused.value)
    ? focused.value
    : undefined,
)
</script>

<template>
  <!--
    isolation keeps the layers blending with each other rather than with the
    row behind them. Equal translucent plates therefore accumulate into one
    neutral shared form while their departures keep their own color, including
    above the tinted background a row takes under the pointer.
  -->
  <span
    class="overprint"
    :class="{
      outlined: outlineOn,
      fanned: cycle.hovering.value,
      scrubbable: scrub && layers.length > 1,
      scrubbing: cycle.scrubbing.value,
    }"
    :style="{
      '--size': typeof size === 'number' ? `${size}px` : size,
      '--n': layers.length,
      '--fan-step': cycle.fan.value,
      '--overprint-opacity': plateOpacity,
      viewTransitionName: morph && morphWhole ? morph : undefined,
    }"
    :aria-label="label"
    role="img"
    v-on="cycle.on"
  >
    <span
      v-for="(layer, index) in layers"
      :key="layer.group"
      class="layer overprint-layer"
      :class="[
        `hanji-${layer.region}`,
        {
          dimmed: activeFocus !== undefined && layer.group !== activeFocus,
        },
      ]"
      :style="{
        '--i': index,
        '--layer-color': colorOf(layer.group),
        viewTransitionName:
          morph && !morphWhole ? `${morph}-${layer.group}` : undefined,
      }"
      aria-hidden="true"
      >{{ layer.char }}</span
    >

    <!-- Sits under the stack without taking any room from it: the square this
         element occupies is what the row grid and the route transition are
         both measured against. -->
    <LitRegions
      v-if="litColumns.length"
      class="lit"
      :columns="litColumns"
      :group="cycle.lit.value!"
      :color="colorOf(cycle.lit.value!)"
      aria-hidden="true"
    />
  </span>
</template>

<style scoped>
/* Color, blending, the fan and how the held-back layers behave are shared
   with every other stack in the app; see styles/overprint.css. */
.overprint {
  position: relative;
  display: inline-grid;
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
}

/* Carried on a patch of paper, because what is beneath it is whatever the
   stack happens to be sitting above -- the next row of the table, most often. */
.lit {
  position: absolute;
  top: calc(100% + 0.3rem);
  left: 50%;
  padding: 0 0.25rem;
  border-radius: 3px;
  background: var(--c-paper);
  pointer-events: none;
  translate: -50% 0;
}

/* Hollow: the color moves from the fill to the stroke, so the shapes read
   through one another instead of stacking into a single mass. The floor keeps
   the stroke visible on the row thumbnails, where an em is only 32px. */
.outlined .layer {
  color: transparent;
  -webkit-text-stroke: clamp(0.65px, 0.009em, 1.35px) var(--layer-color);
}
</style>
