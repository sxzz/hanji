<script setup lang="ts">
import { REGIONS, type CharRow } from '~~/shared/types.ts'

const props = defineProps<{ row: CharRow }>()

const { t } = useT()
const { regionLabel, labelClass } = usePrefs()
const motion = usePreferredReducedMotion()
const split = ref(false)

/**
 * One entry per distinct form, paired with the regions that share it. The
 * stacked layers and these characters carry the same view-transition-name, so
 * toggling makes each form slide out of the pile rather than cross-fade.
 */
const forms = computed(() =>
  REGIONS.map((region, index) => ({
    region,
    char: props.row.chars[index]!,
    group: Number(props.row.glyph[index]),
    /** Only the first region of a group carries the name; it has to be unique. */
    lead: props.row.glyph.indexOf(props.row.glyph[index]!) === index,
  })),
)

function toggle() {
  const flip = () => {
    split.value = !split.value
    return nextTick()
  }
  if (motion.value === 'reduce' || !document.startViewTransition) {
    split.value = !split.value
    return
  }
  document.startViewTransition(flip)
}
</script>

<template>
  <section class="grid gap-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
    <div class="flex justify-center sm:justify-start">
      <div v-if="!split" class="p-2">
        <OverprintChar :row="row" :size="176" morph="hero" animate />
      </div>
      <div v-else class="flex gap-1 p-2 sm:gap-3">
        <div
          v-for="form in forms"
          :key="form.region"
          class="flex flex-col items-center gap-1"
        >
          <span
            :class="`hanji-${form.region}`"
            class="text-[3.25rem] leading-none sm:text-[4.5rem]"
            :style="{
              viewTransitionName: form.lead ? `hero-${form.group}` : undefined,
            }"
            >{{ form.char }}</span
          >
          <span class="eyebrow" :class="labelClass">{{
            regionLabel(form.region)
          }}</span>
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
