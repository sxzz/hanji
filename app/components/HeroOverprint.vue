<script setup lang="ts">
import { projectSignature } from '~~/shared/row.ts'
import { REGIONS, type CharRow } from '~~/shared/types.ts'
import {
  charPath,
  HERO_ROW,
  rowsByKey,
  rowsNaming,
} from '~/composables/chars.ts'

const { t, list, locale } = useT()
const { flagsOn, outlineOn, visibleRegions, regionIndices } = usePrefs()
const split = ref(false)

const HAN = /\p{Script=Han}/u
const firstHan = (text: string) => [...text].find((char) => HAN.test(char))

/**
 * The stack is the field. A reader who wants to see their own character
 * stacked should be able to say so where the stack already is, rather than
 * hunting for a control that puts one there -- so the whole stage takes a
 * caret, and what is typed into it is what gets overprinted.
 *
 * Held as raw text rather than a character because that is what an IME hands
 * over: while a composition is open the field carries romanisation, and only
 * the committed result is worth looking anything up with. v-model already
 * withholds updates until then.
 */
const typed = ref(HERO_ROW.key)
const composing = ref(false)
const field = useTemplateRef<HTMLInputElement>('field')

/** One character to a field. Pasting a word keeps the first character of it. */
watch(typed, (text) => {
  const han = firstHan(text)
  if (han && text !== han) typed.value = han
})

/**
 * Any of a row's names finds it, so 国 and 國 both land on the row keyed 國 --
 * the same reading the search box and the /char routes give a character.
 */
const found = computed(() => {
  const char = firstHan(typed.value)
  if (!char) return undefined
  return rowsByKey.get(char) ?? rowsNaming(char)[0]
})

/**
 * A character the dataset has never heard of leaves the last one standing and
 * says so underneath, rather than emptying the stage. Mid-composition the
 * field is full of letters that name nothing either, and the same rule keeps
 * the stage still while they are typed.
 */
const shown = shallowRef<CharRow>(HERO_ROW)
watchEffect(() => {
  if (!typed.value) shown.value = HERO_ROW
  else if (found.value) shown.value = found.value
})

const missing = computed(() => {
  const char = firstHan(typed.value)
  return char && !found.value ? char : undefined
})

/**
 * Groups over the regions on show, so the opening claim counts what the reader
 * is actually being shown rather than every region this row happens to carry.
 */
const groups = computed(() =>
  projectSignature(shown.value.glyph, regionIndices.value),
)

/** One persistent node per region. CSS moves these same nodes between the
 * overprint and the separated row, so toggling never needs a DOM swap. */
const forms = computed(() =>
  visibleRegions.value.map((region, position) => ({
    region,
    char: shown.value.chars[REGIONS.indexOf(region)]!,
    group: Number(groups.value[position]),
    /** Shared forms only draw once while stacked, then duplicate when split. */
    lead: groups.value.indexOf(groups.value[position]!) === position,
  })),
)

const groupCount = computed(
  () => new Set(forms.value.map((form) => form.group)).size,
)

/**
 * Walking the forms is the stacked view answering "how many are in here". Once
 * they are separated the row answers that by itself, and lighting one of them
 * would only be taking the others away.
 */
const cycle = useOverprintCycle(
  () => [...new Set(forms.value.map((form) => form.group))],
  () => !split.value,
)

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
      <!--
        Clicking anywhere on the stack puts the caret in the field underneath
        it, so the character being compared is edited where it is drawn.
      -->
      <div
        class="hero-plane overprint"
        :class="{ fanned: cycle.hovering.value }"
        :title="label"
        :aria-label="label"
        role="img"
        v-on="cycle.on"
        @click="field?.focus()"
      >
        <div
          v-for="(form, index) in forms"
          :key="form.region"
          class="hero-form overprint-layer"
          :class="{
            duplicate: !form.lead,
            baseline: form.group === 0,
            dimmed:
              cycle.lit.value !== undefined && form.group !== cycle.lit.value,
          }"
          :style="{
            '--i': index,
            '--layer-color': groupColor(form.group),
            '--arrival-delay': `${index * 90}ms`,
          }"
          aria-hidden="true"
        >
          <!-- Keyed on the character so a new one restamps the plate rather
               than swapping the text under a settled layer -->
          <span
            :key="form.char"
            :class="`hanji-${form.region}`"
            class="hero-glyph"
            >{{ form.char }}</span
          >
          <span class="hero-label eyebrow">
            <RegionLabel :flag="flagsOn" :region="form.region" />
          </span>
        </div>
      </div>

      <!-- Ruled like something to be written on. Separated, there is no one
           stack left for a character to be typed into. -->
      <div class="hero-field" :aria-hidden="split">
        <input
          ref="field"
          v-model="typed"
          class="hero-input focus-ring"
          type="text"
          :class="{ composing }"
          :aria-label="t('hero.field')"
          :tabindex="split ? -1 : undefined"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          @compositionstart="composing = true"
          @compositionend="composing = false"
        />
        <p class="hero-hint eyebrow">
          <template v-if="missing">{{
            t('hero.missing', { char: missing })
          }}</template>
          <template v-else>{{ t('hero.fieldHint') }}</template>
        </p>
      </div>
    </div>

    <div class="max-w-lg">
      <h2 class="text-2xl leading-snug sm:text-3xl">
        {{ t('hero.title', { n: hanNumber(groupCount, locale) }) }}
      </h2>
      <p class="mt-3 text-sm text-soft leading-relaxed sm:text-base">
        {{ t('hero.body', { regions: places }) }}
      </p>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <!-- Nothing to pull apart when a single column is left on show -->
        <button
          v-if="forms.length > 1"
          type="button"
          class="focus-ring inline-flex items-center gap-1.5 btn-ghost px-3 py-1.5 text-sm"
          :aria-pressed="split"
          @click="toggle"
        >
          <span
            :class="split ? 'i-ri-stack-line' : 'i-ri-layout-column-line'"
            class="block"
          />
          {{ split ? t('hero.merge') : t('hero.split') }}
        </button>

        <NuxtLink
          :to="charPath(shown.key)"
          class="focus-ring inline-flex items-center gap-1.5 btn-ghost px-3 py-1.5 text-sm"
        >
          <span class="i-ri-arrow-right-line block" />
          {{ t('hero.detail', { char: shown.key }) }}
        </NuxtLink>
      </div>
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

.hero-stage {
  box-sizing: border-box;
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
}

/* Padding and height preserve the original 176px overprint footprint while
   the plane changes width underneath it. */
.hero-plane {
  position: relative;
  width: 100%;
  height: 11rem;
}

.hero:not(.split) .hero-plane {
  cursor: text;
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
  /* Color, blending and the fan itself come from styles/overprint.css. Naming
     `transition` here replaces the shorthand it sets, so the fan's `translate`
     has to be listed again alongside this layout's own travel. */
  transition:
    color var(--hero-duration) var(--hero-ease),
    opacity 160ms ease,
    translate 300ms var(--hero-ease),
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

/*
 * The field. A rule the width of the stack sitting under it, which is the
 * shape of somewhere to write. The text itself stays invisible -- the stack
 * above is what the field renders -- except while an IME composition is open,
 * when the reader has to be able to see the letters they are typing.
 */
.hero-field {
  width: min(11rem, 100%);
  margin-top: 0.75rem;
  transition:
    opacity 200ms ease,
    visibility 200ms;
}

.hero.split .hero-field {
  visibility: hidden;
  opacity: 0;
}

.hero-input {
  width: 100%;
  height: 1.75rem;
  border: 0;
  border-bottom: 1px solid var(--c-rule);
  border-radius: 0;
  background: none;
  color: transparent;
  caret-color: var(--c-ink-mute);
  font-family: inherit;
  font-size: 1rem;
  text-align: center;
  transition:
    border-color 200ms ease,
    caret-color 200ms ease;
}

.hero-input.composing {
  color: var(--c-ink-soft);
}

.hero-plane:hover + .hero-field .hero-input,
.hero-input:hover {
  border-bottom-color: var(--c-ink-mute);
}

.hero-input:focus {
  border-bottom-color: var(--c-ink);
  caret-color: var(--c-g1);
  outline: none;
}

.hero-hint {
  /* Two lines' worth, so swapping the prompt for a "no such character" never
     moves the standfirst beside it. */
  min-height: 2.25rem;
  margin-top: 0.4375rem;
  text-align: center;
  text-wrap: balance;
}

/* Separated, the forms step out from the middle of the row, and lift to leave
   the label room underneath. */
/* Separated, nothing is annotating anything: each form is its own character,
   drawn in ink at full strength. */
.hero.split .hero-form {
  left: calc(50% + var(--split-x));
  top: calc(50% - 0.5rem);
  opacity: 1;
  color: var(--c-ink);
  mix-blend-mode: normal;
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
