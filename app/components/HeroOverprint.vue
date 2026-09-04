<script setup lang="ts">
import {
  overprintColor,
  overprintCommonGroups,
  overprintOpacity,
} from '~~/shared/overprint.ts'
import { projectSignature } from '~~/shared/row.ts'
import { REGIONS, type CharRow } from '~~/shared/types.ts'
import {
  charPath,
  morphName,
  opensElsewhere,
  useMorphingKey,
  useMorphTo,
} from '~/composables/char-navigation.ts'
import {
  HERO_ROW,
  injectChars,
  rowsByKey,
  rowsNaming,
} from '~/composables/chars.ts'

const chars = injectChars()
const { t, list, locale } = useT()
const { flagsOn, outlineOn, visibleRegions, regionIndices } = usePrefs()
const split = ref(false)

const HAN = /\p{Script=Han}/u
const firstHan = (text: string) => [...text].find((char) => HAN.test(char))

/**
 * The character being compared is typed onto the stack itself. There is no
 * field to find: the caret lands beside the character, and what is typed
 * replaces what is drawn.
 *
 * The input behind that is a plain one, kept invisible and out of the way of
 * the pointer. It is there for the things only a real field gets right --
 * an IME, a mobile keyboard, tabbing to it -- and it holds raw text rather
 * than a character because raw text is what a composition hands over. v-model
 * withholds updates until the composition is committed.
 */
const typed = ref('')
const composing = ref(false)
const focused = ref(false)
const field = useTemplateRef<HTMLInputElement>('field')

/**
 * The character on show, held across a trip to a detail page and back: a
 * reader who typed one in should find it still standing when they return,
 * rather than the app's own opening character. Kept as a key rather than a
 * row so what crosses the hydration payload is one character.
 */
const heroKey = useState('hero-char', () => HERO_ROW.key)
const shown = computed<CharRow>(() => rowsByKey.get(heroKey.value) ?? HERO_ROW)

/** What to say if the last character asked for was not one the dataset has. */
const missing = ref<string>()

/**
 * The field empties the moment it has been read, so it is only ever holding
 * the character being typed right now. Nothing accumulates behind the caret,
 * every entry is read the same way -- the first character of what arrived --
 * and the stack, not the field, is what carries the answer forward.
 *
 * Clearing re-enters this watch with nothing in it, which stops there. Text
 * with no character in it stops there too: that is a composition still being
 * romanized, and the stack holds still until it commits.
 */
watch(typed, (text) => {
  const char = firstHan(text)
  if (!char) return
  // Any of a row's names finds it, so 国 and 國 both land on the row keyed 國
  // -- the same reading the search box and the /char routes give a character.
  const row = rowsByKey.get(char) ?? rowsNaming(char)[0]
  // A character the dataset has never heard of leaves the last one standing
  // and says so underneath, rather than emptying the stage.
  if (row) heroKey.value = row.key
  missing.value = row ? undefined : char
  typed.value = ''
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
 * A uniform character needs no color encoding and remains ordinary ink. Once
 * forms differ, every distinct shape takes an equal color from the same fixed
 * five-ink sequence; dense rows lower all plates together rather than
 * favoring one of them.
 */
const plateOpacity = computed(() =>
  groupCount.value === 1
    ? 1
    : overprintOpacity(shown.value, visibleRegions.value),
)
const plateColor = (group: number) =>
  groupCount.value === 1 ? 'var(--c-ink)' : overprintColor(group)

/**
 * Walking the forms is the stacked view answering "how many are in here". Once
 * they are separated the row answers that by itself, and lighting one of them
 * would only be taking the others away.
 */
const cycle = useOverprintCycle(
  () => [...new Set(forms.value.map((form) => form.group))],
  { enabled: () => !split.value, scrub: () => !split.value },
)

const commonGroups = computed(() =>
  split.value || cycle.scrubbing.value || cycle.lit.value !== undefined
    ? new Set<number>()
    : overprintCommonGroups(
        shown.value,
        visibleRegions.value,
        chars.common.value,
      ),
)

/**
 * The stack is a character to be typed over first and a deck to be pulled
 * apart second, so a press that turned into a drag must not also drop a caret
 * on it -- on a phone that would answer a scrub by throwing the keyboard over
 * the picture.
 */
function focusField() {
  if (!cycle.dragged.value) field.value?.focus()
}

/**
 * Shown whenever the stack is being edited. It stands for where the next
 * character will land rather than for anything in the field -- which is empty
 * between entries, and is a strip of its own while one is being composed.
 */
const caret = computed(() => focused.value && !composing.value && !split.value)

/**
 * The regions the form now lit is written by. The walk shows one form at a
 * time without saying whose it is, which is the one thing a reader watching it
 * wants to know -- so the line under the stack answers, in that form's own
 * accent, and gives up the space again as soon as the pointer leaves.
 */
const litRegions = computed(() =>
  cycle.lit.value === undefined
    ? []
    : forms.value
        .filter((form) => form.group === cycle.lit.value)
        .map((form) => form.region),
)

const label = computed(() =>
  list(
    forms.value.map(
      (form) =>
        `${t(`region.${form.region}.full`)}${locale.value === 'en-US' ? ': ' : '：'}${form.char}`,
    ),
    'narrow',
  ),
)

/**
 * The standfirst, read off the partition in front of the reader rather than
 * asserting something general about Han characters. Changing the character
 * changes what there is to say about it, and a line that went on claiming
 * four regions "often" differ under a character all four write the same way
 * was the one part of the hero that did not answer to the field.
 *
 * The count is left to the headline directly above, which already carries it.
 */
const body = computed(() => {
  const named = (region: string) => t(`region.${region}.full`)

  // Groups in the order their first region appears, so the sentence runs left
  // to right across the same row the stack is drawn from.
  const byGroup = new Map<number, string[]>()
  for (const form of forms.value)
    byGroup.set(form.group, [
      ...(byGroup.get(form.group) ?? []),
      named(form.region),
    ])
  const groups = [...byGroup.values()]
  const everywhere = list(visibleRegions.value.map((region) => named(region)))

  if (groups.length === 1) return t('hero.same', { regions: everywhere })
  if (groups.every((group) => group.length === 1))
    return t('hero.allDiffer', { regions: everywhere })

  // One clause per group that shares a form, then one for whatever is left
  // over. A single leftover is worth naming as the odd one out; several are
  // only worth saying are each their own.
  const alone = groups.filter((group) => group.length === 1).flat()
  const parts = groups
    .filter((group) => group.length > 1)
    .map((group) => t('hero.share', { regions: list(group) }))
  if (alone.length === 1) parts.push(t('hero.only', { region: alone[0]! }))
  else if (alone.length > 1)
    parts.push(t('hero.rest', { regions: list(alone) }))

  return t('hero.mixed', { parts: parts.join(t('hero.join')) })
})

function toggle() {
  split.value = !split.value
}

/**
 * The hero opens a character the same way a row does, so the stack the reader
 * was looking at is the one that grows into the detail page. Separated there
 * is no single stack to travel, and the plain navigation is left alone.
 */
const morphing = useMorphingKey()
const morphTo = useMorphTo()
const morph = computed(() =>
  morphing.value?.from === 'hero' && morphing.value.key === shown.value.key
    ? morphName(shown.value.key)
    : undefined,
)

async function open(event: MouseEvent) {
  if (split.value || opensElsewhere(event)) return
  event.preventDefault()
  await morphTo(shown.value.key, 'hero')
}

async function openFromField(event: KeyboardEvent) {
  // The Enter that confirms an IME candidate belongs to the composition. The
  // next one, once composition has ended, is the reader asking to leave.
  if (composing.value || event.isComposing) return
  event.preventDefault()
  await morphTo(shown.value.key, 'hero')
}
</script>

<template>
  <section
    class="hero grid gap-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center"
    :class="{ split }"
    :style="{ '--n': forms.length }"
  >
    <div class="hero-stage">
      <!--
        The stack, the field over it and the caret beside it are one object.
        The field cannot live inside the stack: that carries role="img", which
        would take a real input out of the accessibility tree with it.
      -->
      <div class="hero-well" :class="{ editing: focused }">
        <div
          class="hero-plane overprint"
          :class="{
            outlined: outlineOn,
            fanned: cycle.hovering.value,
            scrubbing: cycle.scrubbing.value,
          }"
          :style="{
            '--fan-step': cycle.fan.value,
            '--overprint-opacity': plateOpacity,
            viewTransitionName: morph,
          }"
          :aria-label="label"
          role="img"
          v-on="cycle.on"
          @click="focusField()"
        >
          <div
            v-for="(form, index) in forms"
            :key="form.region"
            class="hero-form overprint-layer"
            :class="{
              duplicate: !form.lead,
              dimmed:
                cycle.lit.value !== undefined && form.group !== cycle.lit.value,
              emphasized: commonGroups.has(form.group),
              subdued: commonGroups.size > 0 && !commonGroups.has(form.group),
            }"
            :style="{
              '--i': index,
              '--layer-color': plateColor(form.group),
              '--arrival-delay': `${index * 90}ms`,
            }"
            aria-hidden="true"
          >
            <!-- Keyed on the character, so asking for a new one changes the
                 plate rather than swapping the text under a settled layer. A
                 region whose character the new row happens to write the same
                 way keeps its key, and simply does not move. -->
            <Transition name="restamp" appear>
              <span
                :key="form.char"
                :class="`hanji-${form.region}`"
                class="hero-glyph"
                >{{ form.char }}</span
              >
            </Transition>
            <span class="hero-label eyebrow">
              <RegionLabel :flag="flagsOn" :region="form.region" />
            </span>
          </div>
        </div>

        <!--
          Invisible, and deaf to the pointer: the stack above takes the clicks
          and hands the focus down.
        -->
        <input
          ref="field"
          v-model="typed"
          class="hero-input"
          type="text"
          :aria-label="t('hero.field')"
          :tabindex="split ? -1 : undefined"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          @focus="focused = true"
          @blur="focused = false"
          @compositionstart="composing = true"
          @compositionend="composing = false"
          @keydown.enter="openFromField"
        />

        <!-- Drawn rather than left to the browser: a caret set at the size of
             the character would be a 176px bar. -->
        <span v-if="caret" class="hero-caret" aria-hidden="true" />
      </div>

      <!-- One line, three jobs: whose form is lit while the walk is running,
           what went wrong with the last character asked for, and otherwise how
           to ask for another. It is sized for the longest of them so none of
           them moves the standfirst beside it. -->
      <p class="hero-hint eyebrow">
        <LitRegions
          v-if="litRegions.length"
          :columns="litRegions"
          :group="cycle.lit.value!"
          :color="plateColor(cycle.lit.value!)"
        />
        <template v-else-if="missing">{{
          t('hero.missing', { char: missing })
        }}</template>
        <template v-else>{{ t('hero.fieldHint') }}</template>
      </p>
    </div>

    <div class="max-w-lg">
      <h2 class="text-2xl leading-snug sm:text-3xl">
        {{ t('hero.title', { n: hanNumber(groupCount, locale) }) }}
      </h2>
      <p class="mt-3 text-sm text-soft leading-relaxed sm:text-base">
        {{ body }}
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
          @click="open"
        >
          <span class="i-ri-arrow-right-line block" />
          {{ t('hero.detail') }}
        </NuxtLink>

        <ClientOnly>
          <PwaInstallPrompt variant="hero" class="inline-flex sm:hidden" />
        </ClientOnly>
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
   * The overprint is these same nodes scaled up to a --stack-size square, so
   * the scale is read off the size rather than tuned by hand -- changing the
   * size alone keeps the stack exactly where it was. The smallest phones step
   * both down, where five forms and a 320px viewport leave nothing spare.
   */
  --stack-size: 11rem;
  --form-em: 3.5;
  --form-size: calc(var(--form-em) * 1rem);
  --form-step: 3.25rem;
  /* Reads as --stack-size / --form-size, which CSS will not divide. */
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

.hero-well {
  position: relative;
  width: 100%;
}

/*
 * Exactly the square the character is drawn in, centered in the stage. Sized
 * to the picture rather than to the column it sits in, so what answers to a
 * pointer is the character and not the space beside it -- and so the box that
 * travels to the detail page is the character's own, not a wider one that
 * would have to squeeze on arrival.
 */
.hero-plane {
  position: relative;
  width: var(--stack-size);
  max-width: 100%;
  height: var(--stack-size);
  margin-inline: auto;
}

/*
 * Stacked, the plane is a character you type over and a deck you can pull
 * apart. The caret wins the cursor, because typing is what it is mostly for
 * and the fan under a resting pointer already says the layers move. Vertical
 * panning stays with the page so a phone can scroll past a stack this tall.
 */
.hero:not(.split) .hero-plane {
  cursor: text;
  touch-action: pan-y;
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
     has to be listed again alongside this layout's own travel -- on the shared
     spring, so a scrub released here snaps back exactly as it does anywhere
     else. */
  transition:
    color var(--hero-duration) var(--hero-ease),
    opacity 160ms ease,
    translate 420ms var(--overprint-spring),
    top var(--hero-duration) var(--hero-ease),
    left var(--hero-duration) var(--hero-ease);
}

.hero-form.duplicate {
  opacity: 0;
}

/* Absolute so the character leaving and the one replacing it occupy the same
   square while they cross, instead of the outgoing one holding a place open. */
.hero-glyph {
  position: absolute;
  display: grid;
  inset: 0;
  place-items: center;
  font-size: var(--form-size);
  line-height: 1;
  transform: scale(var(--stack-scale));
  transform-origin: center;
  transition: transform var(--hero-duration) var(--hero-ease);
}

/*
 * Changing the plate. The character asked for arrives from the right as the
 * one it replaces is drawn off to the left -- the two crossing inside the same
 * layer, so they blend against each other on the way past exactly as any two
 * forms in the stack do.
 *
 * Each of these names `transform` again: the shorthand replaces the one on
 * .hero-glyph, and without it a plate changed mid-separation would jump to its
 * new scale rather than traveling to it.
 */
.restamp-enter-active,
.restamp-appear-active {
  transition:
    opacity 300ms ease,
    translate 420ms cubic-bezier(0.22, 1, 0.36, 1),
    transform var(--hero-duration) var(--hero-ease);
}

.restamp-leave-active {
  transition:
    opacity 260ms ease,
    translate 380ms var(--hero-ease),
    transform var(--hero-duration) var(--hero-ease);
}

.restamp-enter-from {
  opacity: 0;
  translate: 1.5rem 0;
}

.restamp-leave-to {
  opacity: 0;
  translate: -2rem 0;
}

/* First paint stamps the layers on in turn rather than sliding them in. */
.restamp-appear-from {
  opacity: 0;
}

.restamp-appear-active {
  transition-delay: var(--arrival-delay);
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
 * The field never shows, composing or not. It covers the stack so a phone
 * scrolls the right thing into view when the keyboard opens, and it is deaf
 * to the pointer so the stack underneath keeps taking the clicks -- and so
 * the hover fan is not interrupted by a field lying over it.
 *
 * Nothing is drawn for a composition in progress either. The IME puts its own
 * window at the caret already, and a second copy of the same romanization
 * over the character was one too many.
 */
.hero-input {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: none;
  color: transparent;
  caret-color: transparent;
  font-family: inherit;
  font-size: 1rem;
  outline: none;
  pointer-events: none;
  text-align: center;
}

/* Selecting the character is invisible, since the character itself is: what
   would show is a bare block of highlight across the stack. */
.hero-input::selection {
  background: transparent;
}

/*
 * Sits just past the character's own right edge, which is half a stack from
 * the middle however wide the stage around it happens to be.
 *
 * This is the whole of the focus indication, as it is for any text field. A
 * ring around the stack was tried and taken out again: a text input matches
 * :focus-visible however it was reached, so it appeared on every click, and a
 * rounded outline around the character put back exactly the look of a form
 * control that keeping the field invisible was meant to be rid of.
 */
.hero-caret {
  position: absolute;
  top: 50%;
  left: calc(50% + var(--stack-size) / 2 + 0.375rem);
  width: 2px;
  height: 54%;
  animation: hero-blink 1.1s step-end infinite;
  background: var(--c-ink);
  translate: 0 -50%;
}

.hero-hint {
  /* Two lines' worth, so swapping the prompt for a "no such character" never
     moves the standfirst beside it. */
  min-height: 2.25rem;
  margin-top: 0.875rem;
  text-align: center;
  text-wrap: balance;
}

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

.hero:not(.split) .hero-plane.outlined .hero-glyph {
  color: transparent;
  -webkit-text-stroke: clamp(0.65px, 0.009em, 1.35px) var(--layer-color);
}

@keyframes hero-blink {
  50% {
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
