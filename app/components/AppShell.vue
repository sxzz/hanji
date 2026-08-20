<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Show the attribution table in the footer. */
    sources?: boolean
  }>(),
  { sources: false },
)

const { t } = useT()
</script>

<template>
  <!-- The nav sits outside the reading column so it can span the viewport
       while it is stuck to the top; everything else shares one measure. -->
  <div class="min-h-screen flex flex-col">
    <AppHeader />

    <div class="mx-auto max-w-6xl w-full flex flex-1 flex-col px-4 sm:px-6">
      <main class="flex-1">
        <slot />
      </main>

      <!-- The sources belong where the whole list is on show. A single
           character's page is about that character, so it only points at
           /about. -->
      <footer
        class="mt-16 border-t border-rule"
        :class="sources ? 'py-8' : 'py-6'"
      >
        <template v-if="sources">
          <h2 class="mb-3 eyebrow">{{ t('footer.sources') }}</h2>
          <DataSources />
        </template>
        <p class="text-xs text-mute" :class="{ 'mt-4': sources }">
          <NuxtLink to="/about" class="rule-link focus-ring">{{
            t('footer.detail')
          }}</NuxtLink>
        </p>
      </footer>
    </div>
  </div>
</template>
