import { useEffect, useRef, useState } from 'react'

interface Options {
  rootMargin?: string
  threshold?: number
}

/** Retorna `true` (uma única vez) quando o elemento entra na tela. */
export function useInView<T extends Element>({ rootMargin = '0px 0px -8% 0px', threshold = 0.12 }: Options = {}) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [rootMargin, threshold])

  return [ref, inView] as const
}
