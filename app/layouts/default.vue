<script setup lang="ts">
const { t } = useT()
</script>

<template>
  <div class="mx-auto max-w-6xl min-h-screen flex flex-col px-4 sm:px-6">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>

    <footer class="mt-16 border-t border-rule py-8">
      <h2 class="mb-3 eyebrow">{{ t('footer.sources') }}</h2>
      <DataSources />
      <p class="mt-4 text-xs text-mute">
        <NuxtLink
          to="/about"
          class="underline decoration-rule underline-offset-4 hover:decoration-ink focus-ring"
          >{{ t('footer.detail') }}</NuxtLink
        >
      </p>
    </footer>
  </div>
</template>
