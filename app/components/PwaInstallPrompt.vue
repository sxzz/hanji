<script setup lang="ts">
import {
  detectPwaInstallMode,
  PWA_INSTALL_DISMISSED_KEY,
  PWA_INSTALL_PROMPT_READY_EVENT,
} from '~/utils/pwa-install.ts'

const { t } = useT()
const { $pwa } = useNuxtApp()
const { pwaDev } = useAppConfig()
const dismissed = useLocalStorage(PWA_INSTALL_DISMISSED_KEY, false)
const displayStandalone = useMediaQuery('(display-mode: standalone)')
const deferredPrompt = shallowRef<BeforeInstallPromptEvent | null>(null)
const appInstalled = ref(false)
const dismissedThisSession = ref(false)
const mounted = ref(false)

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type PwaWindow = Window & {
  __hanjiPwaInstallPrompt?: BeforeInstallPromptEvent | null
}

const pwaWindow = window as PwaWindow
deferredPrompt.value = pwaWindow.__hanjiPwaInstallPrompt ?? null

// Keep a component-level listener as a fallback, while the static head
// listener above preserves an event fired before Vue finished hydrating.
useEventListener(window, 'beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredPrompt.value = event as BeforeInstallPromptEvent
})
useEventListener(window, PWA_INSTALL_PROMPT_READY_EVENT, () => {
  deferredPrompt.value = pwaWindow.__hanjiPwaInstallPrompt ?? null
})

useEventListener(window, 'appinstalled', () => {
  pwaWindow.__hanjiPwaInstallPrompt = null
  deferredPrompt.value = null
  appInstalled.value = true
})

onMounted(() => {
  mounted.value = true
})

const mode = computed(() => {
  if (
    !mounted.value ||
    dismissedThisSession.value ||
    (!pwaDev && dismissed.value) ||
    appInstalled.value
  )
    return null

  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean
  }

  return detectPwaInstallMode({
    promptAvailable: Boolean(deferredPrompt.value || $pwa?.showInstallPrompt),
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
const title = computed(() => t('meta.title'))

async function install(): Promise<void> {
  // Prefer the module's copy when both listeners captured the same event: it
  // also clears its own reactive state after the native dialog opens.
  if ($pwa?.showInstallPrompt) {
    pwaWindow.__hanjiPwaInstallPrompt = null
    deferredPrompt.value = null
    await $pwa.install()
    return
  }

  const prompt = deferredPrompt.value
  if (!prompt) return

  pwaWindow.__hanjiPwaInstallPrompt = null
  deferredPrompt.value = null
  await prompt.prompt()
  await prompt.userChoice
}

function dismiss(): void {
  pwaWindow.__hanjiPwaInstallPrompt = null
  deferredPrompt.value = null
  dismissedThisSession.value = true
  if (!pwaDev) {
    dismissed.value = true
    $pwa?.cancelInstall()
  }
}
</script>

<template>
  <Transition name="pwa-install">
    <aside
      v-if="mode"
      class="pwa-install fixed z-50 border border-rule rounded-lg bg-paper p-3 shadow-black/5 shadow-lg"
      role="region"
      :aria-label="title"
    >
      <div class="flex items-start gap-2.5">
        <HanjiMark class="mt-0.5 size-9" />

        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium leading-5">{{ title }}</p>
          <p class="mt-0.5 text-sm text-soft leading-5">{{ description }}</p>

          <button
            v-if="mode === 'native'"
            type="button"
            class="focus-ring mt-2 h-9 inline-flex items-center gap-2 rounded-md bg-ink px-3.5 text-sm text-paper transition-opacity duration-150 hover:opacity-85"
            @click="install"
          >
            <span class="i-ri-download-2-line" aria-hidden="true" />
            {{ t('pwa.install') }}
          </button>
        </div>

        <button
          type="button"
          class="focus-ring icon-btn shrink-0 -mr-1 -mt-1"
          :aria-label="t('pwa.dismiss')"
          @click="dismiss"
        >
          <span class="i-ri-close-line text-base" aria-hidden="true" />
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.pwa-install {
  top: calc(var(--nav-h) + 0.75rem);
  right: max(1rem, env(safe-area-inset-right));
  width: min(22rem, calc(100vw - 2rem));
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
  transform: translateY(-0.5rem);
}

@media (min-width: 640px) {
  .pwa-install {
    right: max(1.5rem, env(safe-area-inset-right));
    width: min(22rem, calc(100vw - 3rem));
  }
}
</style>
