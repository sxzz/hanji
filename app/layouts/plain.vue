<script setup lang="ts">
const { t } = useT()
</script>

<template>
  <!-- No attribution table here: a single character's page is about that
       character, and the sources belong on /about. -->
  <div class="mx-auto max-w-6xl min-h-screen flex flex-col px-4 sm:px-6">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <footer class="mt-16 border-t border-rule py-6 text-xs text-mute">
      <NuxtLink
        to="/about"
        class="underline decoration-rule underline-offset-4 hover:decoration-ink focus-ring"
        >{{ t('footer.detail') }}</NuxtLink
      >
    </footer>
  </div>
</template>
