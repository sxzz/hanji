<script setup lang="ts">
import type { Region } from '~~/shared/types.ts'

type RegionOptionPart = {
  region?: Region
  suffix?: string
}

const props = withDefaults(
  defineProps<{
    active: boolean
    disabled?: boolean
    label: string
    parts: readonly RegionOptionPart[]
    size?: 'compact' | 'default'
    title?: string
  }>(),
  {
    disabled: false,
    size: 'default',
    title: undefined,
  },
)

defineEmits<{ select: [] }>()

const { flagsOn } = usePrefs()
const iconOnly = computed(
  () => props.parts.length === 1 && !props.parts[0]?.suffix,
)
</script>

<template>
  <!--
    Regional artwork is content, never state. Selection therefore lives on
    the control's edge and surface contrast, where neither a flag nor a short
    text label can cover it. Muting resting flags is only a supporting cue.
  -->
  <button
    type="button"
    class="region-option focus-ring"
    :class="[
      active ? 'region-option-active' : 'region-option-resting',
      `region-option-${size}`,
      iconOnly ? 'region-option-icon' : '',
    ]"
    :disabled="disabled"
    :title="title ?? label"
    :aria-label="label"
    :aria-pressed="active"
    @click="$emit('select')"
  >
    <span class="region-option-content" aria-hidden="true">
      <span
        v-for="(part, index) in parts"
        :key="`${part.region ?? ''}:${part.suffix ?? ''}:${index}`"
        class="region-option-part"
      >
        <RegionLabel v-if="part.region" :flag="flagsOn" :region="part.region" />
        <span v-if="part.suffix" class="whitespace-nowrap">{{
          part.suffix
        }}</span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.region-option {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--c-rule);
  border-radius: 4px;
  background: var(--c-paper-sunk);
  color: var(--c-ink-mute);
  line-height: 1;
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    color 150ms ease;
}

.region-option-default {
  min-width: 1.75rem;
  height: 1.75rem;
  padding-inline: 0.5rem;
  font-size: 0.75rem;
}

.region-option-compact {
  min-width: 1.375rem;
  height: 1.375rem;
  padding-inline: 0.375rem;
  border-radius: 3px;
  font-size: 0.6875rem;
}

.region-option-icon {
  padding-inline: 0;
}

.region-option-content,
.region-option-part {
  display: inline-flex;
  align-items: center;
}

.region-option-content {
  gap: 0.25rem;
}

.region-option-part {
  gap: 0.375rem;
}

.region-option-resting:hover:not(:disabled) {
  border-color: var(--c-ink-mute);
  background: var(--c-paper);
  color: var(--c-ink-soft);
}

.region-option-active {
  border-color: color-mix(in srgb, var(--c-ink-soft) 75%, var(--c-ink-mute));
  background: var(--c-paper);
  color: var(--c-ink);
}

.region-option-resting :deep(.region-flag) {
  filter: saturate(0.7);
  opacity: 0.68;
}

.region-option-active :deep(.region-flag) {
  filter: none;
  opacity: 1;
}

.region-option-compact :deep(.region-flag) {
  width: 1.15em;
  height: 1.15em;
}

.region-option:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (prefers-reduced-motion: reduce) {
  .region-option {
    transition: none;
  }
}
</style>
