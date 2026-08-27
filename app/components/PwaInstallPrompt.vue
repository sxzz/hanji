<script setup lang="ts">
import { GOATCOUNTER_EVENTS } from '~/utils/goatcounter.ts'
import {
  detectPwaInstallMode,
  PWA_INSTALL_PROMPT_READY_EVENT,
} from '~/utils/pwa-install.ts'

const props = withDefaults(
  defineProps<{
    variant?: 'nav' | 'hero'
  }>(),
  {
    variant: 'nav',
  },
)

const { t } = useT()
const { $pwa } = useNuxtApp()
const goatCounter = useGoatCounter()
const displayStandalone = useMediaQuery('(display-mode: standalone)')
const deferredPrompt = useState<BeforeInstallPromptEvent | null>(
  'pwa-install-prompt',
  () => null,
)
const appInstalled = useState('pwa-app-installed', () => false)
const mounted = ref(false)

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void> | void
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type PwaWindow = Window & {
  __hanjiPwaInstallPrompt?: BeforeInstallPromptEvent | null
}

const pwaWindow = window as PwaWindow
deferredPrompt.value = pwaWindow.__hanjiPwaInstallPrompt
  ? markRaw(pwaWindow.__hanjiPwaInstallPrompt)
  : null

// Keep a component-level listener as a fallback, while the static head
// listener above preserves an event fired before Vue finished hydrating.
useEventListener(window, 'beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredPrompt.value = markRaw(event as BeforeInstallPromptEvent)
})
useEventListener(window, PWA_INSTALL_PROMPT_READY_EVENT, () => {
  deferredPrompt.value = pwaWindow.__hanjiPwaInstallPrompt
    ? markRaw(pwaWindow.__hanjiPwaInstallPrompt)
    : null
})

useEventListener(window, 'appinstalled', () => {
  const firstNotice = !appInstalled.value
  pwaWindow.__hanjiPwaInstallPrompt = null
  deferredPrompt.value = null
  appInstalled.value = true
  if (firstNotice) goatCounter?.event(...GOATCOUNTER_EVENTS.pwaInstall)
})

onMounted(() => {
  mounted.value = true
})

const mode = computed(() => {
  if (!mounted.value || appInstalled.value) return null

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
</script>

<template>
  <span v-if="mode === 'native'" class="shrink-0 items-center text-$c-g1">
    <button
      type="button"
      class="pwa-install-control focus-ring inline-flex items-center"
      :class="
        props.variant === 'hero'
          ? 'gap-1.5 btn-ghost px-3 py-1.5 text-sm'
          : 'h-8 gap-1 rounded-md px-1.5 transition-colors duration-150 hover:bg-sunk'
      "
      :title="t('pwa.description')"
      @click="install"
    >
      <span class="i-ri-download-2-line block text-sm" aria-hidden="true" />
      <span class="whitespace-nowrap">{{ t('pwa.install') }}</span>
    </button>
  </span>
</template>

<style scoped>
.pwa-install-control {
  color: var(--c-g1);
}
</style>
