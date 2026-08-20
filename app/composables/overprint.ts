import type { MaybeRefOrGetter } from 'vue'

/**
 * How long each form holds while the pointer rests on a stack. Long enough to
 * take a glyph in, short enough that a four-form stack has come round before
 * anyone thinks to move on.
 */
const LIT_MS = 720

/**
 * Grace before the first form lights. A pointer on its way down a page of
 * thumbnails crosses a dozen stacks; none of them should start performing.
 */
const GRACE_MS = 240

export interface OverprintCycle {
  /** The pointer is resting on the stack, which fans its layers apart. */
  hovering: Readonly<Ref<boolean>>
  /** The group currently lit, or undefined while the stack is at rest. */
  lit: Readonly<Ref<number | undefined>>
  /** Spread onto the stack element with `v-on`. */
  on: Record<string, (event: PointerEvent) => void>
}

/**
 * The behavior shared by every overprint on the site: the hero, the row
 * thumbnails and the character being compared on a detail page.
 *
 * A stack reads as one picture, which tells the reader nothing about how many
 * forms went into it. Resting a pointer on one walks through them, lighting a
 * single form at a time while the rest fall back -- so a stack answers "what
 * is actually in here" without the reader having to take it apart. The layers
 * also fan apart by a couple of pixels, which is the stack saying it has parts
 * before the walk has begun.
 *
 * Touch has no resting pointer: a tap there is a tap, and would leave the
 * stack lit with no way to say stop. Those pointers are left alone.
 */
export function useOverprintCycle(
  groups: MaybeRefOrGetter<readonly number[]>,
  enabled: MaybeRefOrGetter<boolean> = true,
): OverprintCycle {
  const motion = usePreferredReducedMotion()
  const hovering = ref(false)
  const step = ref<number>()

  const active = computed(() => toValue(enabled) && toValue(groups).length > 1)

  const { pause, resume } = useIntervalFn(
    () => {
      const count = toValue(groups).length
      if (count) step.value = ((step.value ?? -1) + 1) % count
    },
    LIT_MS,
    { immediate: false },
  )

  const { start: openGrace, stop: cancelGrace } = useTimeoutFn(
    () => {
      step.value = 0
      // A reader who has asked for less motion still gets the fan and the
      // first form; what they are spared is the loop that keeps changing it.
      if (motion.value !== 'reduce') resume()
    },
    GRACE_MS,
    { immediate: false },
  )

  function rest() {
    cancelGrace()
    pause()
    hovering.value = false
    step.value = undefined
  }

  function enter(event: PointerEvent) {
    if (event.pointerType === 'touch' || !toValue(enabled)) return
    hovering.value = true
    if (active.value) openGrace()
  }

  /** A stack whose contents change under the pointer starts its walk again. */
  watch(
    () => toValue(groups).length,
    () => {
      if (step.value !== undefined) step.value = 0
    },
  )

  watch(active, (on) => {
    if (on) return
    cancelGrace()
    pause()
    step.value = undefined
  })

  const lit = computed(() => {
    const list = toValue(groups)
    return step.value === undefined ? undefined : list[step.value % list.length]
  })

  return {
    hovering: readonly(hovering),
    lit,
    on: { pointerenter: enter, pointerleave: rest, pointercancel: rest },
  }
}
