/**
 * Scrolls an element to the top of the viewport.
 *
 * Native `smooth` has no speed control and is slow enough that turning a page
 * feels sluggish, so this animates by hand over a short duration -- and skips
 * the animation entirely when the reader has asked for reduced motion.
 */
export function useScrollToTop() {
  const motion = usePreferredReducedMotion()

  return (target: HTMLElement | undefined | null) => {
    if (!target) return
    const to = Math.max(0, window.scrollY + target.getBoundingClientRect().top)

    if (motion.value === 'reduce') {
      window.scrollTo({ top: to })
      return
    }

    const from = window.scrollY
    const distance = to - from
    if (distance === 0) return

    const DURATION = 240
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION)
      // easeOutCubic: quick off the mark, gentle on arrival
      window.scrollTo({ top: from + distance * (1 - (1 - progress) ** 3) })
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
}
