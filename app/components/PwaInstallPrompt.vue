<script setup lang="ts">
import {
  detectPwaInstallMode,
  PWA_INSTALL_DISMISSED_KEY,
} from '~/utils/pwa-install.ts'

const { t } = useT()
const { $pwa } = useNuxtApp()
const dismissed = useLocalStorage(PWA_INSTALL_DISMISSED_KEY, false)
const displayStandalone = useMediaQuery('(display-mode: standalone)')
const appInstalled = ref(false)
const mounted = ref(false)

useEventListener(window, 'appinstalled', () => {
  appInstalled.value = true
})

onMounted(() => {
  mounted.value = true
})

const mode = computed(() => {
  if (!mounted.value || dismissed.value || appInstalled.value) return null

  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean
  }

  return detectPwaInstallMode({
    promptAvailable: Boolean($pwa?.showInstallPrompt),
    standalone:
      displayStandalone.value || navigatorWithStandalone.standalone === true,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  })
})

const description = computed(() =>
  mode.value === 'native'
    ? t('pwa.description')
    : mode.value
      ? t(`pwa.instructions.${mode.value}`)
      : '',
)

async function install(): Promise<void> {
  await $pwa?.install()
}

function dismiss(): void {
  dismissed.value = true
  $pwa?.cancelInstall()
}
</script>

<template>
  <Transition name="pwa-install">
    <aside
      v-if="mode"
      class="pwa-install fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-paper px-4 pt-3 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[min(26rem,calc(100vw-2rem))] sm:border sm:rounded-lg sm:p-4"
      role="region"
      :aria-label="t('pwa.title')"
    >
      <div class="flex items-start gap-3">
        <HanjiMark class="mt-0.5 size-10" />

        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold leading-5">{{ t('pwa.title') }}</p>
          <p class="mt-0.5 text-sm text-soft leading-5">{{ description }}</p>

          <button
            v-if="mode === 'native'"
            type="button"
            class="focus-ring mt-3 min-h-11 inline-flex items-center gap-2 rounded-md bg-ink px-4 text-sm text-paper transition-opacity duration-150 hover:opacity-85"
            @click="install"
          >
            <span class="i-ri-download-2-line" aria-hidden="true" />
            {{ t('pwa.install') }}
          </button>
        </div>

        <button
          type="button"
          class="focus-ring size-11 flex-center shrink-0 rounded-md text-mute transition-colors duration-150 -mr-2 -mt-2 hover:text-ink sm:-mr-2 sm:-mt-2"
          :aria-label="t('pwa.dismiss')"
          @click="dismiss"
        >
          <span class="i-ri-close-line text-lg" aria-hidden="true" />
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.pwa-install {
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  box-shadow: 0 -10px 30px color-mix(in srgb, var(--c-ink) 8%, transparent);
}

.pwa-install-enter-active,
.pwa-install-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.pwa-install-enter-from,
.pwa-install-leave-to {
  opacity: 0;
  transform: translateY(0.75rem);
}

@media (min-width: 640px) {
  .pwa-install {
    padding-bottom: 1rem;
    box-shadow: 0 12px 36px color-mix(in srgb, var(--c-ink) 12%, transparent);
  }
}
</style>
