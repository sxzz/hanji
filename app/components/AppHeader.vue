<script setup lang="ts">
const { t } = useT()
</script>

<template>
  <header class="flex items-baseline gap-4 py-5">
    <NuxtLink to="/" class="flex items-baseline gap-2 focus-ring">
      <h1 class="text-base font-medium">{{ t('meta.title') }}</h1>
      <span class="text-sm text-mute">{{ t('meta.name') }}</span>
    </NuxtLink>

    <nav class="ml-auto flex items-center gap-3 text-sm text-mute sm:gap-4">
      <NuxtLink to="/about" class="nav-link focus-ring">{{
        t('nav.about')
      }}</NuxtLink>
      <StyleToggle />
      <OptionsMenu />
      <ThemeToggle />
    </nav>
  </header>
</template>
