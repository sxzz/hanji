<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import {
  KANJIVG_LICENSE,
  kanjiVGDataUrl,
  kanjiVGViewerUrl,
  parseKanjiVG,
  strokeDuration,
  type KanjiVGStroke,
} from '~/utils/kanjivg.ts'

const props = defineProps<{ char: string }>()
const { t } = useT()

type Status = 'loading' | 'ready' | 'missing' | 'error'
type Phase = 'idle' | 'playing' | 'paused' | 'done'

const status = ref<Status>('loading')
const phase = ref<Phase>('idle')
const strokes = shallowRef<KanjiVGStroke[]>([])
const viewBox = ref('0 0 109 109')
const completed = ref(0)
const active = ref<number>()
const activePoint = ref<{ x: number; y: number }>()
const lengths = ref<number[]>([])
const pathElements: SVGPathElement[] = []

let request: AbortController | undefined
let animation: Animation | undefined
let run = 0

const total = computed(() => strokes.value.length)
const current = computed(() =>
  active.value === undefined ? completed.value : active.value + 1,
)
const viewerUrl = computed(() => kanjiVGViewerUrl(props.char))
const progressLabel = computed(() =>
  t('char.strokeProgress', { current: current.value, total: total.value }),
)
const playLabel = computed(() => {
  if (phase.value === 'playing') return t('char.strokePause')
  if (phase.value === 'done') return t('char.strokeReplay')
  return t('char.strokePlay')
})
const playIcon = computed(() => {
  if (phase.value === 'playing') return 'i-ri-pause-fill'
  if (phase.value === 'done') return 'i-ri-replay-line'
  return 'i-ri-play-fill'
})

function setPathElement(
  element: Element | ComponentPublicInstance | null,
  i: number,
) {
  if (element instanceof SVGPathElement) pathElements[i] = element
}

function stop(next: Phase = 'idle') {
  run++
  animation?.cancel()
  animation = undefined
  active.value = undefined
  activePoint.value = undefined
  phase.value = next
}

async function measure() {
  await nextTick()
  lengths.value = strokes.value.map(
    (_, i) => pathElements[i]?.getTotalLength() ?? 0,
  )
}

async function load() {
  request?.abort()
  stop()
  status.value = 'loading'
  strokes.value = []
  lengths.value = []
  completed.value = 0
  pathElements.length = 0

  const controller = new AbortController()
  request = controller
  try {
    const response = await fetch(kanjiVGDataUrl(props.char), {
      cache: 'force-cache',
      signal: controller.signal,
    })
    if (response.status === 404) {
      status.value = 'missing'
      return
    }
    if (!response.ok) throw new Error(`KanjiVG returned ${response.status}`)
    const data = parseKanjiVG(await response.text())
    if (controller.signal.aborted) return
    strokes.value = data.strokes
    viewBox.value = data.viewBox
    status.value = 'ready'
    await measure()
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError'))
      status.value = 'error'
  }
}

async function play() {
  if (phase.value === 'playing') {
    animation?.pause()
    phase.value = 'paused'
    return
  }
  if (phase.value === 'paused' && animation) {
    phase.value = 'playing'
    animation.play()
    return
  }

  if (phase.value === 'done') completed.value = 0
  const thisRun = ++run
  phase.value = 'playing'
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  for (let i = completed.value; i < strokes.value.length; i++) {
    if (thisRun !== run) return
    const element = pathElements[i]
    const length = lengths.value[i]
    if (!element || !length) {
      completed.value = i + 1
      continue
    }

    active.value = i
    const point = element.getPointAtLength(0)
    activePoint.value = { x: point.x, y: point.y }
    animation = element.animate(
      { strokeDashoffset: [length, 0] },
      {
        duration: reducedMotion ? 1 : strokeDuration(length),
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards',
      },
    )
    try {
      await animation.finished
    } catch {
      return
    }
    if (thisRun !== run) return
    completed.value = i + 1
    await nextTick()
    animation.cancel()
    animation = undefined
  }

  animation = undefined
  active.value = undefined
  activePoint.value = undefined
  phase.value = 'done'
}

function step(delta: -1 | 1) {
  const target = Math.max(0, Math.min(total.value, current.value + delta))
  stop(target === total.value ? 'done' : 'idle')
  completed.value = target
}

onMounted(load)
watch(() => props.char, load)
onBeforeUnmount(() => {
  request?.abort()
  stop()
})
</script>

<template>
  <section v-if="status !== 'missing'" aria-labelledby="stroke-order-title">
    <div
      class="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2"
    >
      <h2 id="stroke-order-title" class="eyebrow font-normal">
        {{ t('char.strokeOrder') }}
      </h2>
      <p class="text-xs text-mute">
        {{ t('char.strokeSource') }}：
        <a
          :href="viewerUrl"
          target="_blank"
          rel="noreferrer"
          class="underline decoration-rule underline-offset-4 hover:decoration-current focus-ring"
          >KanjiVG</a
        >
        ·
        <a
          :href="KANJIVG_LICENSE"
          target="_blank"
          rel="noreferrer"
          class="underline decoration-rule underline-offset-4 hover:decoration-current focus-ring"
          >CC BY-SA 3.0</a
        >
      </p>
    </div>

    <div
      v-if="status === 'loading'"
      class="grid animate-pulse gap-5 sm:grid-cols-[minmax(13rem,16rem)_1fr] sm:items-center"
      :aria-label="t('char.strokeLoading')"
    >
      <div class="aspect-square border border-rule bg-sunk" />
      <div class="flex flex-col gap-4">
        <div class="h-10 w-32 bg-sunk" />
        <div class="h-4 w-full max-w-sm bg-sunk" />
        <div class="h-9 w-48 bg-sunk" />
      </div>
    </div>

    <div
      v-else-if="status === 'error'"
      class="flex items-center justify-between gap-4 border-y border-rule py-4 text-sm text-soft"
    >
      <span>{{ t('char.strokeError') }}</span>
      <button
        type="button"
        class="shrink-0 border border-rule rounded-md px-3 py-1.5 text-ink transition-colors hover:border-ink/30 focus-ring"
        @click="load"
      >
        {{ t('char.strokeRetry') }}
      </button>
    </div>

    <div
      v-else
      class="grid gap-5 sm:grid-cols-[minmax(13rem,16rem)_1fr] sm:items-center sm:gap-8"
    >
      <div class="stroke-board mx-auto aspect-square w-full max-w-64">
        <svg
          :viewBox="viewBox"
          class="block size-full"
          role="img"
          :aria-label="t('char.strokeDiagram', { char, total })"
        >
          <g class="stroke-guides" aria-hidden="true">
            <path d="M54.5 0V109M0 54.5H109" />
            <path class="stroke-guide-diagonal" d="M0 0L109 109M109 0L0 109" />
          </g>
          <g class="stroke-underlay" aria-hidden="true">
            <path v-for="stroke in strokes" :key="stroke.order" :d="stroke.d" />
          </g>
          <g class="stroke-ink">
            <path
              v-for="(stroke, i) in strokes"
              :key="stroke.order"
              :ref="(element) => setPathElement(element, i)"
              :d="stroke.d"
              :class="active === i ? 'stroke-current' : ''"
              :style="{
                strokeDasharray: lengths[i],
                strokeDashoffset: i < completed ? 0 : lengths[i],
              }"
            />
          </g>
          <circle
            v-if="activePoint"
            class="stroke-lead"
            :cx="activePoint.x"
            :cy="activePoint.y"
            r="2"
          />
        </svg>
      </div>

      <div class="flex min-w-0 flex-col justify-center gap-5">
        <span class="hanji-jp self-center text-5xl leading-none" lang="ja">{{
          char
        }}</span>

        <div class="flex flex-col gap-2">
          <span class="self-end eyebrow tabular" aria-live="polite">
            {{ progressLabel }}
          </span>
          <div
            class="grid gap-1"
            :style="{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }"
            aria-hidden="true"
          >
            <span
              v-for="stroke in strokes"
              :key="stroke.order"
              class="h-0.5 transition-colors duration-150"
              :class="
                active === stroke.order - 1
                  ? 'bg-$c-g1'
                  : stroke.order <= completed
                    ? 'bg-$c-ink'
                    : 'bg-$c-rule'
              "
            />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div class="flex shrink-0 items-center gap-2">
            <button
              type="button"
              class="flex-center size-9 border border-rule rounded-md text-soft transition-colors hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 focus-ring"
              :disabled="current === 0"
              :aria-label="t('char.strokePrevious')"
              :title="t('char.strokePrevious')"
              @click="step(-1)"
            >
              <span class="i-ri-skip-back-mini-fill block" />
            </button>
            <button
              type="button"
              class="inline-flex h-9 min-w-24 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm text-paper transition-opacity hover:opacity-80 focus-ring"
              @click="play"
            >
              <span :class="playIcon" class="block" />
              {{ playLabel }}
            </button>
            <button
              type="button"
              class="flex-center size-9 border border-rule rounded-md text-soft transition-colors hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 focus-ring"
              :disabled="current >= total"
              :aria-label="t('char.strokeNext')"
              :title="t('char.strokeNext')"
              @click="step(1)"
            >
              <span class="i-ri-skip-forward-mini-fill block" />
            </button>
          </div>
          <p class="min-w-0 flex-1 basis-32 text-xs text-mute leading-relaxed">
            {{ t('char.strokeHint') }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stroke-board {
  border: 1px solid var(--c-rule);
  background: var(--c-paper-sunk);
}

.stroke-guides {
  fill: none;
  stroke: var(--c-rule);
  stroke-width: 0.65;
}

.stroke-guide-diagonal {
  stroke-dasharray: 2.25 2.25;
}

.stroke-underlay,
.stroke-ink {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.stroke-underlay {
  stroke: var(--c-ink-mute);
  stroke-width: 3;
  opacity: 0.16;
}

.stroke-ink {
  stroke: var(--c-ink);
  stroke-width: 3.2;
}

.stroke-ink path {
  will-change: stroke-dashoffset;
}

.stroke-ink .stroke-current {
  stroke: var(--c-g1);
}

.stroke-lead {
  fill: var(--c-g1);
  stroke: var(--c-paper-sunk);
  stroke-width: 1;
  animation: lead-pulse 900ms ease-out infinite;
  pointer-events: none;
}

@keyframes lead-pulse {
  50% {
    r: 2.8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stroke-lead {
    animation: none;
  }
}
</style>
