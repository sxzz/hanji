<script setup lang="ts">
import { LOCALE_OLD_FORM_WIKIPEDIA } from '~/locales/index.ts'

const { t, locale } = useT()
const trigger = ref<HTMLButtonElement>()
const card = ref<HTMLElement>()
const link = ref<HTMLAnchorElement>()
const descriptionId = useId()
const cardId = useId()

const open = ref(false)
const below = ref(false)
const left = ref(0)
const top = ref(0)
const width = ref(230)
let triggerHovered = false
let cardHovered = false
let closeTimer: ReturnType<typeof setTimeout> | undefined

const wikipedia = computed(() => LOCALE_OLD_FORM_WIKIPEDIA[locale.value])

function clearCloseTimer() {
  if (closeTimer !== undefined) clearTimeout(closeTimer)
  closeTimer = undefined
}

function updatePosition() {
  if (!trigger.value) return
  const triggerRect = trigger.value.getBoundingClientRect()
  const cardHeight = card.value?.getBoundingClientRect().height ?? 88
  const viewportGap = 8
  const nextWidth = Math.min(230, window.innerWidth - viewportGap * 2)

  width.value = nextWidth
  left.value = Math.min(
    Math.max(
      triggerRect.left + triggerRect.width / 2 - nextWidth / 2,
      viewportGap,
    ),
    window.innerWidth - nextWidth - viewportGap,
  )
  below.value = triggerRect.top - viewportGap - cardHeight < viewportGap
  top.value = below.value
    ? triggerRect.bottom + viewportGap
    : triggerRect.top - viewportGap
}

function show() {
  clearCloseTimer()
  open.value = true
  nextTick(updatePosition)
}

function scheduleHide() {
  clearCloseTimer()
  closeTimer = setTimeout(() => {
    const active = document.activeElement
    if (
      triggerHovered ||
      cardHovered ||
      active === trigger.value ||
      (active && card.value?.contains(active))
    )
      return
    open.value = false
  }, 120)
}

function focusLink() {
  show()
  nextTick(() => {
    updatePosition()
    link.value?.focus()
  })
}

function onTriggerEnter() {
  triggerHovered = true
  show()
}

function onTriggerLeave() {
  triggerHovered = false
  scheduleHide()
}

function onCardEnter() {
  cardHovered = true
  clearCloseTimer()
}

function onCardLeave() {
  cardHovered = false
  scheduleHide()
}

const onViewportChange = () => {
  if (open.value) updatePosition()
}

onMounted(() => {
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onBeforeUnmount(() => {
  clearCloseTimer()
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})

watch(locale, () => nextTick(updatePosition))
</script>

<template>
  <span class="old-form-help">
    <button
      ref="trigger"
      type="button"
      class="old-form-trigger focus-ring"
      :aria-label="t('region.old.full')"
      :aria-describedby="descriptionId"
      :aria-controls="cardId"
      :aria-expanded="open"
      @click.stop="focusLink"
      @mouseenter="onTriggerEnter"
      @mouseleave="onTriggerLeave"
      @focus="show"
      @blur="scheduleHide"
    >
      {{ t('region.old.short') }}
    </button>
    <span :id="descriptionId" class="sr-only">
      {{ t('region.old.description') }}
    </span>
  </span>

  <Teleport to="body">
    <Transition name="old-form-pop">
      <div
        v-if="open"
        :id="cardId"
        ref="card"
        class="old-form-card"
        :style="{
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          transform: below ? undefined : 'translateY(-100%)',
        }"
        @mouseenter="onCardEnter"
        @mouseleave="onCardLeave"
        @focusin="clearCloseTimer"
        @focusout="scheduleHide"
      >
        <p>{{ t('region.old.description') }}</p>
        <a
          ref="link"
          :href="wikipedia"
          class="old-form-link focus-ring"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
        >
          <span>{{ t('region.old.wikipedia') }}</span>
          <span
            class="i-ri-external-link-line block shrink-0"
            aria-hidden="true"
          />
        </a>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.old-form-help {
  display: inline-flex;
}

.old-form-trigger {
  padding: 0 0.125rem;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  text-decoration: underline dotted var(--c-rule);
  text-underline-offset: 0.2em;
  cursor: help;
}

.old-form-trigger:hover,
.old-form-trigger[aria-expanded='true'] {
  color: var(--c-ink);
  text-decoration-color: currentColor;
}

.old-form-card {
  position: fixed;
  z-index: 50;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--c-rule);
  border-radius: 6px;
  background: var(--c-paper);
  color: var(--c-ink-soft);
  font-family: var(--font-ui);
  font-size: 0.75rem;
  line-height: 1.5;
}

.old-form-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
  color: var(--c-ink);
  text-decoration: underline;
  text-decoration-color: var(--c-rule);
  text-underline-offset: 0.18em;
}

.old-form-link:hover {
  text-decoration-color: currentColor;
}

.old-form-pop-enter-active,
.old-form-pop-leave-active {
  transition: opacity 120ms ease;
}

.old-form-pop-enter-from,
.old-form-pop-leave-to {
  opacity: 0;
}
</style>
