import { useEffect, useRef } from 'react'

/**
 * Executa `callback(scrollY)` no máximo uma vez por quadro de animação durante
 * o scroll e o redimensionamento. Ideal para efeitos visuais que alteram o DOM
 * diretamente (sem re-renderizar o React), mantendo o scroll fluido no celular.
 */
export function useScrollFrame(callback: (scrollY: number) => void) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  })

  useEffect(() => {
    let frame = 0
    const run = () => {
      frame = 0
      callbackRef.current(window.scrollY)
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(run)
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])
}
