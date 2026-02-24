import { useEffect, useState } from 'react'

/**
 * Returns a phase number that increments on a schedule.
 * Used to drive staggered entrance animations.
 *
 * Phase schedule:
 *   0 = nothing visible (initial)
 *   1 = hero band visible          (t=50ms)
 *   2 = metric strip visible       (t=350ms)
 *   3 = pipeline section visible   (t=600ms)
 *   4 = action cards visible       (t=1150ms)
 *   5 = bottom strip visible       (t=1250ms)
 */
export function useMountPhase(): number {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    if (mediaQuery.matches) {
      // Skip all animation — jump straight to full phase
      setPhase(5)
      return
    }

    const timings: [number, number][] = [
      [50, 1],
      [350, 2],
      [600, 3],
      [1150, 4],
      [1250, 5],
    ]

    const timers = timings.map(([delay, targetPhase]) =>
      window.setTimeout(() => setPhase(targetPhase), delay)
    )

    return () => timers.forEach(clearTimeout)
  }, [])

  return phase
}
