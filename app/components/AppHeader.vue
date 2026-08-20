<script setup lang="ts">
const { t } = useT()
</script>

<template>
  <!--
    Stuck to the top: the reader changes typeface, language and columns while
    reading the table, and having to scroll back up to reach them made those
    controls feel further away than they are. Height is fixed rather than
    padded so --nav-h can be relied on by everything sticky underneath.
  -->
  <header class="sticky top-0 z-40 bg-paper">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <!-- Positioned for the options panel, which drops to the full width of
           this row on a narrow screen. -->
      <div class="relative h-[var(--nav-h)] flex items-center">
        <NuxtLink
          to="/"
          class="mr-auto flex shrink-0 items-baseline gap-2 focus-ring"
        >
          <h1 class="whitespace-nowrap text-base font-medium">
            {{ t('meta.title') }}
          </h1>
          <span class="hidden whitespace-nowrap text-sm text-mute xs:inline">{{
            t('meta.name')
          }}</span>
        </NuxtLink>

        <!--
          One row, two readings of it. On a phone “关于” is an icon and joins
          the other icons at the end; from md it becomes a word and leads,
          because a row that opens with a link and closes with icons is the
          shape a desktop nav is read in.
        -->
        <nav class="flex items-center gap-1 text-sm text-mute md:gap-3">
          <NuxtLink
            to="/about"
            class="nav-link order-3 h-8 w-8 flex-center rounded-md md:order-1 md:h-auto md:w-auto focus-ring"
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

          <StyleToggle class="order-1 md:order-2" />
          <LocaleMenu class="order-2 md:order-3" />
          <OptionsMenu class="order-4" />
          <ThemeToggle class="order-5" />

          <a
            href="https://github.com/sxzz/hanji"
            target="_blank"
            rel="noopener noreferrer"
            class="icon-btn order-6 focus-ring"
            :title="t('nav.github')"
            :aria-label="t('nav.github')"
          >
            <span class="i-simple-icons-github block" aria-hidden="true" />
          </a>
        </nav>
      </div>
    </div>
  </header>
</template>
