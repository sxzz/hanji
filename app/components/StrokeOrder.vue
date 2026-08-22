<script setup lang="ts">
import {
  ANIMCJK_HOME,
  ANIMCJK_LICENSE,
  ANIMCJK_REVEAL_WIDTH,
  ANIMCJK_VIEW_BOX,
  unpackAnimCJK,
  type StrokeOrderChoice,
} from '~/utils/animcjk.ts'
import { STROKE_SPEED_KEY } from '~/utils/preference-restore.ts'
import { loadStrokeGroup, strokeDuration } from '~/utils/stroke-data.ts'
import type { ComponentPublicInstance } from 'vue'
import type {
  PackedStrokeGroup,
  StrokeAnimationData,
  StrokeAnimationPath,
} from '~~/shared/strokes.ts'
import type { Column } from '~~/shared/types.ts'

const props = defineProps<{ choices: readonly StrokeOrderChoice[] }>()
const { t, locale } = useT()

type Status = 'loading' | 'ready' | 'error'
type Phase = 'idle' | 'playing' | 'paused' | 'done'
type StrokeSpeed = (typeof STROKE_SPEEDS)[number]

const SKELETON_DELAY_MS = 100
const STROKE_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

const LOCALE_COLUMN = {
  'zh-CN': 'cn',
  'zh-HK': 'hk',
  'zh-TW': 'tw',
  'ja-JP': 'jp',
  'ko-KR': 'kr',
} as const

const selected = ref<Column>()
const status = ref<Status>('loading')
const isLoading = ref(true)
const showSkeleton = ref(true)
const phase = ref<Phase>('idle')
const displayedChoice = shallowRef<StrokeOrderChoice>()
const loadedGroup = shallowRef<{
  key: string
  data: PackedStrokeGroup
}>()
const strokes = shallowRef<StrokeAnimationPath[]>([])
const viewBox = ref(ANIMCJK_VIEW_BOX)
const strokeTransform = ref<string>()
const revealWidth = ref(ANIMCJK_REVEAL_WIDTH)
const completed = ref(0)
const active = ref<number>()
const lengths = ref<number[]>([])
const speed = ref<StrokeSpeed>(1)
const storedSpeed = useLocalStorage<number>(STROKE_SPEED_KEY, 1, {
  writeDefaults: false,
})
const pathElements: SVGPathElement[] = []
const clipPrefix = useId().replaceAll(':', '')

let mounted = false
let requestVersion = 0
let animation: Animation | undefined
let run = 0

const { start: revealSkeleton, stop: cancelSkeletonReveal } = useTimeoutFn(
  () => {
    if (isLoading.value) {
      status.value = 'loading'
      showSkeleton.value = true
    }
  },
  SKELETON_DELAY_MS,
  { immediate: false },
)

const currentChoice = computed(
  () =>
    props.choices.find((choice) => choice.column === selected.value) ??
    props.choices[0],
)
const visibleChoice = computed(() => {
  const current = currentChoice.value
  const displayed = displayedChoice.value
  if (status.value !== 'ready') return current
  return current &&
    current.groupKey === displayed?.groupKey &&
    current.variant === displayed.variant
    ? current
    : displayed
})
const choiceOptions = computed(() =>
  props.choices.map((choice) => ({
    value: choice.column,
    parts: choice.columns.map((column, index) =>
      column === 'old'
        ? {
            ...(choice.columns[index - 1] === 'jp'
              ? {}
              : { region: 'jp' as const }),
            suffix: t('region.old.short'),
          }
        : { region: column },
    ),
    title: choice.columns
      .map((column) =>
        column === 'old' ? t('region.old.full') : t(`region.${column}.full`),
      )
      .join(' + '),
  })),
)
const loadKey = computed(() => {
  const choice = currentChoice.value
  return choice ? `${choice.groupKey}:${choice.variant}` : ''
})
const total = computed(() => strokes.value.length)
const viewBoxRect = computed<[number, number, number, number]>(() => {
  const values = viewBox.value
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  return values.length === 4 && values.every(Number.isFinite)
    ? (values as [number, number, number, number])
    : [0, 0, 1024, 1024]
})
const crossGuide = computed(() => {
  const [x, y, width, height] = viewBoxRect.value
  const middleX = x + width / 2
  const middleY = y + height / 2
  return `M${middleX} ${y}V${y + height}M${x} ${middleY}H${x + width}`
})
const diagonalGuide = computed(() => {
  const [x, y, width, height] = viewBoxRect.value
  return `M${x} ${y}L${x + width} ${y + height}M${x + width} ${y}L${x} ${y + height}`
})
const current = computed(() =>
  active.value === undefined ? completed.value : active.value + 1,
)
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
const clipPathId = (index: number) => `${clipPrefix}-stroke-${index}`
const clipPathUrl = (index: number) => `url(#${clipPathId(index)})`
const isStrokeSpeed = (value: number): value is StrokeSpeed =>
  STROKE_SPEEDS.includes(value as StrokeSpeed)

function selectPreferred() {
  const preferred = LOCALE_COLUMN[locale.value]
  const next = props.choices.find((choice) =>
    choice.columns.includes(preferred),
  )
  if (next) selected.value = next.column
  else if (!props.choices.some((choice) => choice.column === selected.value))
    selected.value = props.choices[0]?.column
}

function setPathElement(
  element: Element | ComponentPublicInstance | null,
  index: number,
) {
  if (element instanceof SVGPathElement) pathElements[index] = element
}

function stop(next: Phase = 'idle') {
  run++
  animation?.cancel()
  animation = undefined
  active.value = undefined
  phase.value = next
}

async function measure() {
  await nextTick()
  lengths.value = strokes.value.map(
    (_, index) => pathElements[index]?.getTotalLength() ?? 0,
  )
}

async function displayChoice(choice: StrokeOrderChoice) {
  const data: StrokeAnimationData | undefined = unpackAnimCJK(
    loadedGroup.value?.data.variants[choice.variant],
  )
  if (!data) throw new Error('declared stroke data is missing')

  cancelSkeletonReveal()
  isLoading.value = false
  showSkeleton.value = false
  stop()
  pathElements.length = 0
  completed.value = 0
  strokes.value = data.strokes
  viewBox.value = data.viewBox
  strokeTransform.value = data.transform
  revealWidth.value = data.revealWidth ?? ANIMCJK_REVEAL_WIDTH
  displayedChoice.value = choice
  status.value = 'ready'
  await measure()
}

async function load() {
  const version = ++requestVersion
  const choice = currentChoice.value
  if (!choice) {
    isLoading.value = false
    return
  }

  if (loadedGroup.value?.key === choice.groupKey) {
    try {
      await displayChoice(choice)
    } catch {
      status.value = 'error'
    }
    return
  }

  stop()
  cancelSkeletonReveal()
  const keepCurrent =
    status.value === 'ready' && displayedChoice.value !== undefined
  isLoading.value = true
  if (keepCurrent) {
    showSkeleton.value = false
    revealSkeleton()
  } else {
    status.value = 'loading'
    showSkeleton.value = true
  }

  try {
    const data = await loadStrokeGroup(choice.groupKey)
    if (version !== requestVersion) return
    if (!data) throw new Error('declared stroke group is missing')
    loadedGroup.value = { key: choice.groupKey, data }
    const latest = currentChoice.value
    if (!latest || latest.groupKey !== choice.groupKey) return
    await displayChoice(latest)
  } catch {
    if (version !== requestVersion) return
    cancelSkeletonReveal()
    isLoading.value = false
    showSkeleton.value = false
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

  for (let index = completed.value; index < strokes.value.length; index++) {
    if (thisRun !== run) return
    const element = pathElements[index]
    const length = lengths.value[index]
    if (!element || !length) {
      completed.value = index + 1
      continue
    }

    active.value = index
    // Let Vue reveal the active path before starting its Web Animation. Paths
    // waiting for their turn stay hidden to avoid round dash caps showing as
    // stray dots when strokeDashoffset equals the full path length.
    await nextTick()
    if (thisRun !== run) return
    animation = element.animate(
      { strokeDashoffset: [length, 0] },
      {
        duration: reducedMotion
          ? 1
          : strokeDuration(length, viewBoxRect.value[2]),
        easing: 'linear',
        fill: 'forwards',
      },
    )
    animation.playbackRate = speed.value
    try {
      await animation.finished
    } catch {
      return
    }
    if (thisRun !== run) return
    completed.value = index + 1
    await nextTick()
    animation.cancel()
    animation = undefined
  }

  animation = undefined
  active.value = undefined
  phase.value = 'done'
}

function step(delta: -1 | 1) {
  const target = Math.max(0, Math.min(total.value, current.value + delta))
  stop(target === total.value ? 'done' : 'idle')
  completed.value = target
}

watch(
  () =>
    props.choices
      .map(
        (choice) =>
          `${choice.column}:${choice.columns.join('+')}:${choice.variant}`,
      )
      .join(','),
  selectPreferred,
  { immediate: true },
)
watch(locale, selectPreferred)
watch(speed, (value) => {
  storedSpeed.value = value
  animation?.updatePlaybackRate(value)
})
watch(loadKey, () => {
  if (mounted) load()
})
onMounted(() => {
  mounted = true
  if (isStrokeSpeed(storedSpeed.value)) speed.value = storedSpeed.value
  load()
})
onBeforeUnmount(() => {
  requestVersion++
  cancelSkeletonReveal()
  stop()
})
</script>

<template>
  <section
    v-if="choices.length"
    aria-labelledby="stroke-order-title"
    :aria-busy="isLoading"
  >
    <div
      class="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3"
    >
      <div class="min-w-0 flex flex-wrap items-center gap-3">
        <h2 id="stroke-order-title" class="eyebrow font-normal">
          {{ t('char.strokeOrder') }}
        </h2>
        <RegionChoice
          v-if="choiceOptions.length > 1 && selected"
          v-model="selected"
          :group-label="t('char.strokeOrder')"
          :options="choiceOptions"
        />
      </div>
      <p v-if="status === 'ready'" class="text-xs text-mute">
        {{ t('char.strokeSource') }}：
        <a
          :href="ANIMCJK_HOME"
          target="_blank"
          rel="noreferrer"
          class="focus-ring underline decoration-rule underline-offset-4 hover:decoration-current"
          >AnimCJK</a
        >
        ·
        <a
          :href="ANIMCJK_LICENSE"
          target="_blank"
          rel="noreferrer"
          class="focus-ring underline decoration-rule underline-offset-4 hover:decoration-current"
          >Arphic Public License</a
        >
      </p>
      <span
        v-else-if="status === 'loading'"
        aria-hidden="true"
        class="h-3 max-w-full w-44 bg-sunk"
        :class="showSkeleton ? 'animate-pulse' : 'invisible'"
      />
    </div>

    <div
      v-if="status === 'loading'"
      role="status"
      class="grid gap-5 sm:grid-cols-[minmax(13rem,16rem)_1fr] sm:items-center sm:gap-8"
      :class="showSkeleton ? 'animate-pulse' : 'invisible'"
      :aria-label="t('char.strokeLoading')"
    >
      <div class="stroke-board mx-auto aspect-square max-w-64 w-full" />
      <div class="min-w-0 flex flex-col justify-center gap-5">
        <span class="block size-16 self-center bg-sunk" />

        <div class="flex flex-col gap-2">
          <span class="h-3 w-16 self-end bg-sunk" />
          <span class="grid grid-cols-8 gap-1" aria-hidden="true">
            <span v-for="index in 8" :key="index" class="h-0.5 bg-sunk" />
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span class="flex shrink-0 items-center gap-2">
            <span class="block size-9 border border-rule rounded-md bg-sunk" />
            <span class="block h-9 w-24 rounded-md bg-sunk" />
            <span class="block size-9 border border-rule rounded-md bg-sunk" />
            <span
              class="block h-9 w-22 border border-rule rounded-md bg-sunk"
            />
          </span>
          <span class="min-w-0 flex flex-1 basis-32 flex-col gap-2">
            <span class="h-3 w-full bg-sunk" />
            <span class="h-3 w-2/3 bg-sunk" />
          </span>
        </div>
      </div>
    </div>

    <div
      v-else-if="status === 'error'"
      class="flex items-center justify-between gap-4 border-y border-rule py-4 text-sm text-soft"
    >
      <span>{{ t('char.strokeError') }}</span>
      <button
        type="button"
        class="focus-ring shrink-0 border border-rule rounded-md px-3 py-1.5 text-ink transition-colors hover:border-ink/30"
        @click="load"
      >
        {{ t('char.strokeRetry') }}
      </button>
    </div>

    <div
      v-else
      class="grid gap-5 sm:grid-cols-[minmax(13rem,16rem)_1fr] sm:items-center sm:gap-8"
    >
      <div class="stroke-board mx-auto aspect-square max-w-64 w-full">
        <svg
          :viewBox="viewBox"
          class="block size-full"
          role="img"
          :aria-label="
            t('char.strokeDiagram', {
              char: visibleChoice?.char ?? '',
              total,
            })
          "
        >
          <g class="stroke-guides" aria-hidden="true">
            <path :d="crossGuide" />
            <path class="stroke-guide-diagonal" :d="diagonalGuide" />
          </g>
          <g :transform="strokeTransform">
            <defs>
              <clipPath
                v-for="(stroke, index) in strokes"
                :id="clipPathId(index)"
                :key="stroke.order"
                clipPathUnits="userSpaceOnUse"
              >
                <path :d="stroke.outline" />
              </clipPath>
            </defs>
            <g class="stroke-underlay" aria-hidden="true">
              <path
                v-for="stroke in strokes"
                :key="stroke.order"
                :d="stroke.outline"
              />
            </g>
            <g class="stroke-completed" aria-hidden="true">
              <path
                v-for="(stroke, index) in strokes"
                :key="stroke.order"
                :d="stroke.outline"
                :class="{ 'stroke-visible': index < completed }"
              />
            </g>
            <g class="stroke-reveal">
              <path
                v-for="(stroke, index) in strokes"
                :key="stroke.order"
                :ref="(element) => setPathElement(element, index)"
                :d="stroke.d"
                :clip-path="clipPathUrl(index)"
                :class="{ 'stroke-current': active === index }"
                :style="{
                  strokeWidth: revealWidth,
                  strokeDasharray: lengths[index],
                  strokeDashoffset: index < completed ? 0 : lengths[index],
                }"
              />
            </g>
          </g>
        </svg>
      </div>

      <div class="min-w-0 flex flex-col justify-center gap-5">
        <svg
          v-if="visibleChoice"
          :viewBox="viewBox"
          class="block size-16 self-center"
          aria-hidden="true"
        >
          <g :transform="strokeTransform" class="stroke-sample">
            <path
              v-for="stroke in strokes"
              :key="stroke.order"
              :d="stroke.outline"
            />
          </g>
        </svg>

        <div class="flex flex-col gap-2">
          <span class="tabular self-end eyebrow" aria-live="polite">
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
              class="focus-ring size-9 flex-center border border-rule rounded-md text-soft transition-colors disabled:cursor-not-allowed hover:border-ink/30 hover:text-ink disabled:opacity-30"
              :disabled="current === 0"
              :aria-label="t('char.strokePrevious')"
              :title="t('char.strokePrevious')"
              @click="step(-1)"
            >
              <span class="i-ri-skip-back-mini-fill block" />
            </button>
            <button
              type="button"
              class="focus-ring h-9 min-w-24 inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm text-paper transition-opacity hover:opacity-80"
              @click="play"
            >
              <span :class="playIcon" class="block" />
              {{ playLabel }}
            </button>
            <button
              type="button"
              class="focus-ring size-9 flex-center border border-rule rounded-md text-soft transition-colors disabled:cursor-not-allowed hover:border-ink/30 hover:text-ink disabled:opacity-30"
              :disabled="current >= total"
              :aria-label="t('char.strokeNext')"
              :title="t('char.strokeNext')"
              @click="step(1)"
            >
              <span class="i-ri-skip-forward-mini-fill block" />
            </button>
            <label
              class="ml-1 h-9 inline-flex shrink-0 items-center gap-1.5 border border-rule rounded-md bg-sunk px-2 text-xs text-mute"
            >
              <span>{{ t('char.strokeSpeed') }}</span>
              <select
                v-model.number="speed"
                class="focus-ring min-w-11 cursor-pointer bg-transparent text-right text-xs text-ink font-mono"
                :aria-label="t('char.strokeSpeed')"
                :title="t('char.strokeSpeed')"
              >
                <option v-for="value in STROKE_SPEEDS" :key="value" :value>
                  {{ value }}×
                </option>
              </select>
            </label>
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
.stroke-completed,
.stroke-reveal,
.stroke-sample {
  shape-rendering: geometricPrecision;
}

.stroke-reveal {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.stroke-underlay {
  fill: var(--c-ink-mute);
  opacity: 0.14;
}

.stroke-completed path {
  visibility: hidden;
}

.stroke-completed .stroke-visible {
  visibility: visible;
}

.stroke-completed {
  fill: var(--c-ink);
}

.stroke-reveal {
  stroke: var(--c-g1);
}

.stroke-reveal path {
  visibility: hidden;
}

.stroke-reveal .stroke-current {
  visibility: visible;
  stroke: var(--c-g1);
  will-change: stroke-dashoffset;
}

.stroke-sample {
  fill: var(--c-ink);
}
</style>
