<script setup lang="ts">
import { projectSignature } from '~~/shared/row.ts'
import { REGIONS, type CharRow } from '~~/shared/types.ts'

const props = defineProps<{ row: CharRow }>()

const { t, list, locale } = useT()
const { flagsOn, outlineOn, visibleRegions, regionIndices } = usePrefs()
const split = ref(false)

/**
 * Groups over the regions on show, so the opening claim counts what the reader
 * is actually being shown rather than every region this row happens to carry.
 */
const groups = computed(() =>
  projectSignature(props.row.glyph, regionIndices.value),
)

/** One persistent node per region. CSS moves these same nodes between the
 * overprint and the separated row, so toggling never needs a DOM swap. */
const forms = computed(() =>
  visibleRegions.value.map((region, position) => ({
    region,
    char: props.row.chars[REGIONS.indexOf(region)]!,
    group: Number(groups.value[position]),
    /** Shared forms only draw once while stacked, then duplicate when split. */
    lead: groups.value.indexOf(groups.value[position]!) === position,
  })),
)

const groupCount = computed(
  () => new Set(forms.value.map((form) => form.group)).size,
)

const colorOf = (group: number) =>
  groupCount.value === 1 ? 'var(--c-ink)' : groupColor(group)

const label = computed(() =>
  list(
    forms.value.map(
      (form) => `${t(`region.${form.region}.full`)}：${form.char}`,
    ),
    'narrow',
  ),
)

/** The places on show, named in full: what the standfirst enumerates. */
const places = computed(() =>
  list(
    visibleRegions.value.map((region) => t(`region.${region}.full`)),
    'narrow',
  ),
)

function toggle() {
  split.value = !split.value
}
</script>

<template>
  <section
    class="hero grid gap-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center"
    :class="{ split, outlined: outlineOn }"
    :style="{ '--n': forms.length }"
  >
    <div class="hero-stage">
      <div class="hero-plane" :title="label" :aria-label="label" role="img">
        <div
          v-for="(form, index) in forms"
          :key="form.region"
          class="hero-form"
          :class="{ duplicate: !form.lead }"
          :style="{
            '--i': index,
            '--layer-color': colorOf(form.group),
            '--arrival-delay': `${index * 90}ms`,
          }"
          aria-hidden="true"
        >
          <span :class="`hanji-${form.region}`" class="hero-glyph">{{
            form.char
          }}</span>
          <span class="hero-label eyebrow">
            <RegionLabel :flag="flagsOn" :region="form.region" />
          </span>
        </div>
      </div>
    </div>

    <div class="max-w-lg">
      <h2 class="text-2xl leading-snug sm:text-3xl">
        {{ t('hero.title', { n: hanNumber(groupCount, locale) }) }}
      </h2>
      <p class="mt-3 text-sm text-soft leading-relaxed sm:text-base">
        {{ t('hero.body', { regions: places }) }}
      </p>

      <!-- Nothing to pull apart when a single column is left on show -->
      <button
        v-if="forms.length > 1"
        type="button"
        class="focus-ring mt-4 inline-flex items-center gap-1.5 btn-ghost px-3 py-1.5 text-sm"
        :aria-pressed="split"
        @click="toggle"
      >
        <span
          :class="split ? 'i-ri-stack-line' : 'i-ri-layout-column-line'"
          class="block"
        />
        {{ split ? t('hero.merge') : t('hero.split') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.hero {
  --hero-duration: 420ms;
  --hero-ease: cubic-bezier(0.32, 0.72, 0, 1);

  /*
   * Size of one separated form, and the fixed distance between two of them.
   * The row keeps that step whatever it is given, so a form sits the same
   * distance from its neighbor with three columns on show or with five, and
   * hiding a region narrows the row rather than spreading the rest apart.
   *
   * The overprint is these same nodes scaled up to an 11rem square, so the
   * scale is read off the size rather than tuned by hand -- changing the size
   * alone keeps the stack exactly where it was. The smallest phones step both
   * down, where five forms and a 320px viewport leave nothing spare.
   */
  --form-em: 3.5;
  --form-size: calc(var(--form-em) * 1rem);
  --form-step: 3.25rem;
  --stack-scale: calc(11 / var(--form-em));
}

@media (min-width: 360px) {
  .hero {
    --form-em: 4;
    --form-step: 4.25rem;
  }
}

/* Padding and minimum height preserve the original 176px overprint footprint
   while the plane changes width underneath it. */
.hero-stage {
  box-sizing: border-box;
  display: flex;
  min-width: 0;
  max-width: 100%;
  min-height: 12.375rem;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.hero-plane {
  position: relative;
  width: 100%;
  height: 11rem;
  isolation: isolate;
}

.hero-form {
  /* Distance from the middle of the row to the middle of this form. */
  --split-x: calc((var(--i) - (var(--n) - 1) / 2) * var(--form-step));

  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--form-size);
  height: var(--form-size);
  /* Own half, so top and left name the center of the form */
  margin-top: calc(var(--form-size) / -2);
  margin-left: calc(var(--form-size) / -2);
  color: var(--layer-color);
  mix-blend-mode: var(--overprint-blend);
  transition:
    color var(--hero-duration) var(--hero-ease),
    opacity 160ms ease,
    top var(--hero-duration) var(--hero-ease),
    left var(--hero-duration) var(--hero-ease);
}

.hero-form.duplicate {
  opacity: 0;
}

.hero-glyph {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  font-size: var(--form-size);
  line-height: 1;
  transform: scale(var(--stack-scale));
  transform-origin: center;
  transition: transform var(--hero-duration) var(--hero-ease);
  animation: hero-arrive 620ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: var(--arrival-delay);
}

.hero-label {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 50%;
  opacity: 0;
  white-space: nowrap;
  transform: translate(-50%, -0.375rem);
  transition:
    opacity 160ms ease,
    transform 280ms var(--hero-ease);
}

/* Separated, the forms step out from the middle of the row, and lift to leave
   the label room underneath. */
.hero.split .hero-form {
  left: calc(50% + var(--split-x));
  top: calc(50% - 0.5rem);
  color: var(--c-ink);
  mix-blend-mode: normal;
}

.hero.split .hero-form.duplicate {
  opacity: 1;
}

.hero.split .hero-glyph {
  transform: scale(1);
}

.hero.split .hero-label {
  opacity: 1;
  transform: translate(-50%, 0);
  transition-delay: 140ms;
}

.hero.outlined:not(.split) .hero-glyph {
  color: transparent;
  -webkit-text-stroke: max(0.6px, 0.014em) var(--layer-color);
}

@keyframes hero-arrive {
  from {
    opacity: 0;
  }
}

/*
 * Beside the standfirst the stage is no longer the width of the column, so it
 * takes the width the separated row comes to: a step per form beyond the
 * first, plus the stage's own 0.5rem of padding on each side.
 */
@media (min-width: 640px) {
  .hero {
    --form-em: 4.5;
    --form-step: 5.25rem;
  }

  .hero-stage {
    width: 12rem;
    justify-content: flex-start;
    transition: width var(--hero-duration) var(--hero-ease);
  }

  .hero.split .hero-stage {
    width: calc(var(--form-size) + (var(--n) - 1) * var(--form-step) + 1rem);
  }
}

/* Room for a larger row only once the standfirst beside it keeps its measure */
@media (min-width: 1024px) {
  .hero {
    --form-em: 5.5;
    --form-step: 6.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-stage,
  .hero-form,
  .hero-glyph,
  .hero-label {
    transition: none;
  }

  .hero-glyph {
    animation: none;
  }
}
</style>
