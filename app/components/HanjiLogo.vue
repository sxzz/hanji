<script setup lang="ts">
const { t } = useT()
</script>

<template>
  <span class="inline-flex items-center gap-2.5">
    <HanjiMark class="size-8 md:size-9" />
    <span class="sr-only xs:hidden">
      {{ t('meta.title') }} · {{ t('meta.name') }}
    </span>
    <span class="hidden flex-col justify-center leading-none xs:flex">
      <span
        class="whitespace-nowrap text-[0.9375rem] font-medium tracking-wide"
      >
        {{ t('meta.title') }}
      </span>
      <span
        class="mt-1 whitespace-nowrap text-[0.6875rem] text-mute tracking-[0.16em]"
      >
        {{ t('meta.name') }}
      </span>
    </span>
  </span>
</template>
