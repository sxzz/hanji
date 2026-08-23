<script setup lang="ts">
type CopyState = 'idle' | 'copying' | 'copied' | 'failed'

const { t } = useT()
const route = useRoute()
const menuId = useId()
const root = useTemplateRef<HTMLElement>('root')
const menu = useTemplateRef<HTMLElement>('menu')
const copyButton = useTemplateRef<HTMLButtonElement>('copyButton')

const open = shallowRef(false)
const copyState = shallowRef<CopyState>('idle')
const logoSource = shallowRef('')
let logoRequest: Promise<string> | undefined

const copyLabel = computed(() => {
  switch (copyState.value) {
    case 'copying':
      return t('nav.copyingLogo')
    case 'copied':
      return t('nav.logoCopied')
    case 'failed':
      return t('nav.copyLogoFailed')
    default:
      return t('nav.copyLogo')
  }
})

const { start: scheduleCopyReset, stop: cancelCopyReset } = useTimeoutFn(
  () => (copyState.value = 'idle'),
  2400,
  { immediate: false },
)

function fetchLogoSource(): Promise<string> {
  if (logoSource.value) return Promise.resolve(logoSource.value)
  logoRequest ??= fetch('/logo.svg')
    .then((response) => {
      if (!response.ok)
        throw new Error(`Logo request failed: ${response.status}`)
      return response.text()
    })
    .then((source) => (logoSource.value = source))
    .catch((error: unknown) => {
      logoRequest = undefined
      throw error
    })
  return logoRequest
}

function openMenu() {
  cancelCopyReset()
  copyState.value = 'idle'
  open.value = true
  fetchLogoSource().catch(() => undefined)
  nextTick(() => copyButton.value?.focus())
}

function closeMenu(restoreFocus = false) {
  if (!open.value) return
  open.value = false
  cancelCopyReset()
  copyState.value = 'idle'
  if (restoreFocus)
    nextTick(() => root.value?.querySelector<HTMLAnchorElement>('a')?.focus())
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault()
  openMenu()
}

function handleTriggerKeydown(event: KeyboardEvent) {
  if (event.key !== 'ContextMenu' && (!event.shiftKey || event.key !== 'F10'))
    return
  event.preventDefault()
  openMenu()
}

function menuItems(): HTMLElement[] {
  return menu.value
    ? [...menu.value.querySelectorAll<HTMLElement>('[role="menuitem"]')]
    : []
}

function handleMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu(true)
    return
  }

  const items = menuItems()
  if (!items.length) return
  const current = Math.max(
    0,
    items.indexOf(document.activeElement as HTMLElement),
  )
  let next: number | undefined

  if (event.key === 'ArrowDown') next = (current + 1) % items.length
  if (event.key === 'ArrowUp')
    next = (current - 1 + items.length) % items.length
  if (event.key === 'Home') next = 0
  if (event.key === 'End') next = items.length - 1
  if (next === undefined) return

  event.preventDefault()
  items[next]?.focus()
}

function legacyCopy(source: string) {
  const field = document.createElement('textarea')
  field.value = source
  field.readOnly = true
  field.style.position = 'fixed'
  field.style.opacity = '0'
  field.style.pointerEvents = 'none'
  document.body.append(field)
  field.select()
  const copied = document.execCommand('copy')
  field.remove()
  if (!copied) throw new Error('Legacy clipboard copy failed')
}

/* eslint-disable baseline-js/use-baseline -- Clipboard support is feature-detected with a legacy fallback. */
async function writeLogo(source: Promise<string>) {
  const clipboard = navigator.clipboard

  if (clipboard?.write && typeof ClipboardItem !== 'undefined') {
    const representations: Record<string, Promise<Blob>> = {
      'text/plain': source.then(
        (svg) => new Blob([svg], { type: 'text/plain' }),
      ),
      'text/html': source.then((svg) => new Blob([svg], { type: 'text/html' })),
    }
    if (ClipboardItem.supports?.('image/svg+xml')) {
      representations['image/svg+xml'] = source.then(
        (svg) => new Blob([svg], { type: 'image/svg+xml' }),
      )
    }

    try {
      await clipboard.write([new ClipboardItem(representations)])
      return
    } catch (error: unknown) {
      if (!clipboard.writeText) throw error
    }
  }

  const svg = await source
  if (clipboard?.writeText) await clipboard.writeText(svg)
  else legacyCopy(svg)
}
/* eslint-enable baseline-js/use-baseline */

async function copyLogo() {
  if (copyState.value === 'copying') return
  cancelCopyReset()
  copyState.value = 'copying'

  try {
    await writeLogo(fetchLogoSource())
    copyState.value = 'copied'
  } catch {
    copyState.value = 'failed'
  }

  scheduleCopyReset()
  nextTick(() => copyButton.value?.focus())
}

onClickOutside(root, () => closeMenu())
useEventListener('resize', () => closeMenu())
useEventListener('scroll', () => closeMenu(), { capture: true, passive: true })
watch(
  () => route.fullPath,
  () => closeMenu(),
)
</script>

<template>
  <div ref="root" class="relative mr-auto flex shrink-0">
    <NuxtLink
      to="/"
      class="focus-ring flex items-center"
      :title="t('nav.logoMenuHint')"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="menuId"
      aria-keyshortcuts="Shift+F10"
      @contextmenu="handleContextMenu"
      @keydown="handleTriggerKeydown"
    >
      <h1 class="flex"><HanjiLogo /></h1>
    </NuxtLink>

    <Transition name="brand-pop">
      <div
        v-if="open"
        :id="menuId"
        ref="menu"
        role="menu"
        :aria-label="t('nav.logoMenu')"
        class="absolute left-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] border border-rule rounded-lg bg-paper p-1.5 text-ink shadow-black/5 shadow-lg"
        @keydown="handleMenuKeydown"
      >
        <button
          ref="copyButton"
          type="button"
          role="menuitem"
          class="focus-ring group w-full flex items-center gap-3 border border-rule rounded-md bg-sunk p-3 text-left transition-colors duration-150 disabled:cursor-wait enabled:hover:border-ink/25"
          :disabled="copyState === 'copying'"
          :aria-busy="copyState === 'copying'"
          @click="copyLogo"
        >
          <HanjiMark class="size-14" />
          <span class="min-w-0 flex-1">
            <span class="block text-sm text-ink font-medium" aria-live="polite">
              {{ copyLabel }}
            </span>
            <span class="mt-1 block text-xs text-mute">{{
              t('nav.logoFormat')
            }}</span>
          </span>
          <span
            v-if="copyState === 'copying'"
            class="i-ri-loader-4-line block shrink-0 animate-spin text-mute"
            aria-hidden="true"
          />
          <span
            v-else-if="copyState === 'copied'"
            class="i-ri-check-line block shrink-0 text-ink"
            aria-hidden="true"
          />
          <span
            v-else-if="copyState === 'failed'"
            class="i-ri-error-warning-line block shrink-0 text-ink"
            aria-hidden="true"
          />
          <span
            v-else
            class="i-ri-file-copy-line block shrink-0 text-mute transition-colors duration-150 group-hover:text-ink"
            aria-hidden="true"
          />
        </button>

        <div class="mt-1.5 border-t border-rule pt-1.5">
          <a
            href="/logo.svg"
            download="hanji-logo.svg"
            role="menuitem"
            class="focus-ring w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-soft transition-colors duration-150 hover:bg-sunk hover:text-ink"
            @click="closeMenu()"
          >
            <span
              class="i-ri-download-2-line block shrink-0"
              aria-hidden="true"
            />
            <span>{{ t('nav.downloadLogo') }}</span>
          </a>
          <NuxtLink
            to="/about#brand-assets"
            role="menuitem"
            class="focus-ring w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-soft transition-colors duration-150 hover:bg-sunk hover:text-ink"
            @click="closeMenu()"
          >
            <span
              class="i-ri-copyright-line block shrink-0"
              aria-hidden="true"
            />
            <span>{{ t('nav.brandCopyright') }}</span>
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.brand-pop-enter-active,
.brand-pop-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.brand-pop-enter-from,
.brand-pop-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}
</style>
