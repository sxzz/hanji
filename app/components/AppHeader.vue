<script setup lang="ts">
const { t } = useT()
</script>

<template>
  <header class="relative flex items-center py-4 md:py-5">
    <NuxtLink
      to="/"
      class="mr-auto flex shrink-0 items-baseline gap-2 focus-ring md:mr-0"
    >
      <h1 class="whitespace-nowrap text-base font-medium">
        {{ t('meta.title') }}
      </h1>
      <span class="hidden whitespace-nowrap text-sm text-mute sm:inline">{{
        t('meta.name')
      }}</span>
    </NuxtLink>

    <nav
      class="flex items-center justify-end text-sm text-mute md:order-2 md:ml-2 md:gap-3"
    >
      <NuxtLink
        to="/about"
        class="nav-link h-8 w-8 flex-center rounded-md md:h-auto md:w-auto focus-ring"
        :aria-label="t('nav.about')"
      >
        <span
          class="i-ri-information-line block md:hidden"
          aria-hidden="true"
        />
        <span class="hidden whitespace-nowrap md:inline">{{
          t('nav.about')
        }}</span>
      </NuxtLink>
      <OptionsMenu />
      <ThemeToggle />
      <a
        href="https://github.com/sxzz/hanji"
        target="_blank"
        rel="noopener noreferrer"
        class="size-8 flex-center rounded-md text-mute transition-colors duration-150 hover:text-ink focus-ring"
        :title="t('nav.github')"
        :aria-label="t('nav.github')"
      >
        <span class="i-simple-icons-github block" aria-hidden="true" />
      </a>
    </nav>

    <div
      class="ml-1 flex items-center justify-end gap-1 text-sm text-mute md:order-1 md:ml-auto md:gap-3"
    >
      <StyleToggle />
      <LocaleMenu />
    </div>
  </header>
</template>
