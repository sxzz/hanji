<script setup lang="ts">
import { REGIONS, type CharRow } from '~~/shared/types.ts'

const props = defineProps<{ row: CharRow }>()

const { t, list } = useT()
const { regionLabel, labelClass, outlineOn } = usePrefs()
const split = ref(false)

/** One persistent node per region. CSS moves these same four nodes between the
 * overprint and the separated row, so toggling never needs a DOM swap. */
const forms = computed(() =>
  REGIONS.map((region, index) => ({
    region,
    char: props.row.chars[index]!,
    group: Number(props.row.glyph[index]),
    /** Shared forms only draw once while stacked, then duplicate when split. */
    lead: props.row.glyph.indexOf(props.row.glyph[index]!) === index,
  })),
)

const groupCount = computed(
  () => new Set(forms.value.map((form) => form.group)).size,
)

const colorOf = (group: number) =>
  groupCount.value === 1 ? 'var(--c-ink)' : `var(--c-g${group + 1})`

const label = computed(() =>
  list(
    forms.value.map((form) => `${regionLabel(form.region)}：${form.char}`),
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
  >
    <div class="hero-stage">
      <div class="hero-plane" :title="label" :aria-label="label" role="img">
        <div
          v-for="(form, index) in forms"
          :key="form.region"
          class="hero-form"
          :class="{ duplicate: !form.lead }"
          :style="{
            '--layer-color': colorOf(form.group),
            '--arrival-delay': `${index * 90}ms`,
          }"
          aria-hidden="true"
        >
          <span :class="`hanji-${form.region}`" class="hero-glyph">{{
            form.char
          }}</span>
          <span class="hero-label eyebrow">
            <span :class="labelClass">{{ regionLabel(form.region) }}</span>
          </span>
        </div>
      </div>
    </div>

    <div class="max-w-lg">
      <h2 class="text-2xl leading-snug sm:text-3xl">{{ t('hero.title') }}</h2>
      <p class="mt-3 text-sm text-soft leading-relaxed sm:text-base">
        {{ t('hero.body') }}
      </p>

      <button
        type="button"
        class="mt-4 inline-flex items-center gap-1.5 border border-rule rounded-md px-3 py-1.5 text-sm text-soft transition-colors duration-150 hover:border-ink/25 hover:text-ink focus-ring"
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
}

/* Padding and minimum height preserve the original 176px overprint's exact
   footprint while the plane changes width underneath it. */
.hero-stage {
  box-sizing: border-box;
  display: flex;
  min-width: 0;
  min-height: 12.375rem;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.hero-plane {
  position: relative;
  width: 11rem;
  height: 11rem;
  isolation: isolate;
  transition: width var(--hero-duration) var(--hero-ease);
}

.hero-form {
  --split-x: 0rem;

  position: absolute;
  top: 50%;
  left: 50%;
  width: 3.25rem;
  height: 3.25rem;
  color: var(--layer-color);
  mix-blend-mode: var(--overprint-blend);
  transform: translate3d(-50%, -50%, 0);
  transition:
    color var(--hero-duration) var(--hero-ease),
    opacity 160ms ease,
    transform var(--hero-duration) var(--hero-ease);
}

.hero-form.duplicate {
  opacity: 0;
}

.hero-form:nth-child(1) {
  --split-x: -5.25rem;
}

.hero-form:nth-child(2) {
  --split-x: -1.75rem;
}

.hero-form:nth-child(3) {
  --split-x: 1.75rem;
}

.hero-form:nth-child(4) {
  --split-x: 5.25rem;
}

.hero-glyph {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  font-size: 3.25rem;
  line-height: 1;
  transform: scale(3.384615);
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

.hero.split .hero-plane {
  width: 13.75rem;
}

.hero.split .hero-form {
  color: var(--c-ink);
  mix-blend-mode: normal;
  transform: translate3d(calc(-50% + var(--split-x)), calc(-50% - 0.5rem), 0);
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

@media (min-width: 640px) {
  .hero-stage {
    width: 12rem;
    justify-content: flex-start;
    transition: width var(--hero-duration) var(--hero-ease);
  }

  .hero.split .hero-stage {
    width: 21.25rem;
  }

  .hero.split .hero-plane {
    width: 20.25rem;
  }

  .hero-form {
    width: 4.5rem;
    height: 4.5rem;
  }

  .hero-form:nth-child(1) {
    --split-x: -7.875rem;
  }

  .hero-form:nth-child(2) {
    --split-x: -2.625rem;
  }

  .hero-form:nth-child(3) {
    --split-x: 2.625rem;
  }

  .hero-form:nth-child(4) {
    --split-x: 7.875rem;
  }

  .hero-glyph {
    font-size: 4.5rem;
    transform: scale(2.444444);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-stage,
  .hero-plane,
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
