import { useEffect, useRef, useState } from 'react'

import { prefersReducedMotion } from '../utils/dom'

/** "Number ticker": anima um número até `target` com desaceleração suave. */
export function useCountUp(target: number, active = true, duration = 1400): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (!active) return
    if (prefersReducedMotion()) {
      setValue(target)
      fromRef.current = target
      return
    }
    const from = fromRef.current
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t) // easeOutExpo
      const current = Math.round(from + (target - from) * eased)
      setValue(current)
      if (t < 1) frame = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, active, duration])

  return value
}
