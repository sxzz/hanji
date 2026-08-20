<script setup lang="ts">
const { t } = useT()
</script>

<template>
  <header
    class="relative flex flex-wrap items-center gap-y-3 py-4 md:flex-nowrap md:py-5"
  >
    <NuxtLink to="/" class="flex shrink-0 items-baseline gap-2 focus-ring">
      <h1 class="whitespace-nowrap text-base font-medium">
        {{ t('meta.title') }}
      </h1>
      <span class="whitespace-nowrap text-sm text-mute">{{
        t('meta.name')
      }}</span>
    </NuxtLink>

    <nav
      class="w-full flex items-center justify-between text-sm text-mute md:ml-auto md:w-auto md:justify-end md:gap-3"
    >
      <NuxtLink
        to="/about"
        class="nav-link h-8 w-8 flex-center rounded-md sm:h-auto sm:w-auto focus-ring"
        :aria-label="t('nav.about')"
      >
        <span
          class="i-ri-information-line block sm:hidden"
          aria-hidden="true"
        />
        <span class="hidden whitespace-nowrap sm:inline">{{
          t('nav.about')
        }}</span>
      </NuxtLink>
      <StyleToggle />
      <LocaleMenu />
      <OptionsMenu />
      <ThemeToggle />
      <a
        href="https://github.com/sxzz/hanji"
        target="_blank"
        rel="noopener noreferrer"
        class="rounded-md p-1.5 text-mute transition-colors duration-150 hover:text-ink focus-ring"
        :title="t('nav.github')"
        :aria-label="t('nav.github')"
      >
        <span class="i-simple-icons-github block" aria-hidden="true" />
      </a>
    </nav>
  </header>
</template>
