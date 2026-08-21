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

/**
 * How far apart the whole deck can be pulled, against the width of the stack
 * being pulled. Measured rather than fixed because the same gesture has to
 * suit a 176px hero and a 150px detail page.
 *
 * Set past one whole stack, so the outer plates clear each other completely
 * and the deck can be read as a row rather than as a smear. Nothing stops the
 * spread reaching outside the page at that range, which is why a stack being
 * scrubbed is lifted and the page clips what runs off the side of it.
 */
const SCRUB_SPAN = 1.3

/** Past this much travel the press was a drag, and was not a click. */
const DRAG_SLOP = 4

export interface OverprintCycle {
  /** The pointer is resting on the stack, which fans its layers apart. */
  hovering: Readonly<Ref<boolean>>
  /** The group currently lit, or undefined while the stack is at rest. */
  lit: Readonly<Ref<number | undefined>>
  /** A hand is holding the layers out of register. */
  scrubbing: Readonly<Ref<boolean>>
  /**
   * Distance between neighboring layers while being scrubbed, as a CSS
   * length. Undefined at every other moment, which hands the spacing back to
   * the stylesheet -- and to the transition that springs it closed.
   */
  fan: Readonly<Ref<string | undefined>>
  /** The last press traveled far enough to be a drag rather than a click. */
  dragged: Readonly<Ref<boolean>>
  /** Spread onto the stack element with `v-on`. */
  on: Record<string, (event: PointerEvent) => void>
}

export interface OverprintOptions {
  enabled?: MaybeRefOrGetter<boolean>
  /**
   * Let a press-and-drag pull the layers out of register by hand. Reserved for
   * the stacks large enough to be worth pulling apart, and kept off the row
   * thumbnails, where the gesture would fight the row's own job of opening a
   * character.
   */
  scrub?: MaybeRefOrGetter<boolean>
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
 * That fan is also the invitation to the gesture underneath it. Pressing and
 * dragging across a stack pulls the layers out of register by hand, the way
 * you would slide one plate against another to see where two impressions
 * differ; letting go springs them back together. It runs on the same axis and
 * about the same center as the fan, so the hover preview reads as a taste of
 * it rather than as a separate trick.
 *
 * Touch has no resting pointer: a tap there is a tap, and would leave the
 * stack lit with no way to say stop. Those pointers get no hover, but they do
 * get the drag, which is deliberate either way.
 */
export function useOverprintCycle(
  groups: MaybeRefOrGetter<readonly number[]>,
  options: OverprintOptions = {},
): OverprintCycle {
  const { enabled = true, scrub = false } = options
  const motion = usePreferredReducedMotion()
  const hovering = ref(false)
  const step = ref<number>()

  const scrubbing = ref(false)
  const dragged = ref(false)
  const reach = ref(0)
  let origin = 0
  let limit = 0

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

  /** Stop walking the forms, whether or not the pointer is still on the stack. */
  function stopWalking() {
    cancelGrace()
    pause()
    step.value = undefined
  }

  function rest() {
    stopWalking()
    hovering.value = false
  }

  function enter(event: PointerEvent) {
    if (event.pointerType === 'touch' || !toValue(enabled)) return
    hovering.value = true
    if (active.value) openGrace()
  }

  /** Gaps between layers, which is what a drag is shared out across. */
  const gaps = () => Math.max(1, toValue(groups).length - 1)

  function down(event: PointerEvent) {
    if (!toValue(scrub) || !active.value || event.button !== 0) return
    const stack = event.currentTarget as Element
    origin = event.clientX
    limit = (stack.getBoundingClientRect().width * SCRUB_SPAN) / gaps()
    reach.value = 0
    dragged.value = false
    scrubbing.value = true
    // Nothing should be lit while the layers are being handled: the reader is
    // already looking at all of them, one beside the other.
    stopWalking()
    stack.setPointerCapture(event.pointerId)
  }

  function drag(event: PointerEvent) {
    if (!scrubbing.value) return
    // No button held: the release happened where the page never saw it.
    if (!event.buttons) return release(event)
    const travel = event.clientX - origin
    if (Math.abs(travel) > DRAG_SLOP) dragged.value = true
    // The drag names the distance across the whole deck; each gap takes an
    // equal share of it, so up to the limit the outermost pair tracks the
    // hand exactly and the deck stays centered on where it started.
    reach.value = Math.max(-limit, Math.min(limit, travel / gaps()))
  }

  function release(event: PointerEvent) {
    if (!scrubbing.value) return
    scrubbing.value = false
    reach.value = 0
    const target = event.currentTarget as Element
    if (target.hasPointerCapture?.(event.pointerId))
      target.releasePointerCapture(event.pointerId)
  }

  /** A stack whose contents change under the pointer starts its walk again. */
  watch(
    () => toValue(groups).length,
    () => {
      if (step.value !== undefined) step.value = 0
    },
  )

  watch(active, (on) => {
    if (!on) stopWalking()
  })

  const lit = computed(() => {
    const list = toValue(groups)
    return step.value === undefined ? undefined : list[step.value % list.length]
  })

  /** Only while a hand is on it; the stylesheet owns every other resting place. */
  const fan = computed(() =>
    scrubbing.value ? `${reach.value.toFixed(2)}px` : undefined,
  )

  return {
    hovering: readonly(hovering),
    lit,
    scrubbing: readonly(scrubbing),
    fan,
    dragged: readonly(dragged),
    on: {
      pointerenter: enter,
      pointerleave: rest,
      pointerdown: down,
      pointermove: drag,
      pointerup: release,
      // Losing the pointer ends the scrub, whatever took it away.
      lostpointercapture: release,
      pointercancel: (event) => {
        release(event)
        rest()
      },
    },
  }
}
