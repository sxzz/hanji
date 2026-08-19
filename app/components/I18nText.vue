<script setup lang="ts">
/**
 * Renders a message that has a slot in the middle of it, e.g. a link, without
 * resorting to v-html. Splits on `{name}` and fills each with the named slot.
 */
const props = defineProps<{ template: string }>()

const parts = computed(() =>
  props.template
    .split(/(\{\w+\})/)
    .filter(Boolean)
    .map((part) => {
      const slot = /^\{(\w+)\}$/.exec(part)?.[1]
      return slot ? { slot } : { text: part }
    }),
)
</script>

<template>
  <p>
    <template v-for="(part, index) in parts" :key="index">
      <slot v-if="part.slot" :name="part.slot" />
      <template v-else>{{ part.text }}</template>
    </template>
  </p>
</template>
