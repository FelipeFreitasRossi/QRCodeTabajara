import { useCallback, useRef, useState } from 'react'

import { getStickyOffset } from '../utils/dom'
import { useScrollFrame } from './useScrollFrame'

/**
 * Descobre qual seção está visível no topo da tela enquanto o cliente rola
 * o cardápio, para destacar a categoria correspondente na barra de navegação.
 */
export function useScrollSpy(sectionIds: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const lockedUntil = useRef(0)

  useScrollFrame(() => {
    if (sectionIds.length === 0 || Date.now() < lockedUntil.current) return

    const offset = getStickyOffset() + 24
    let current: string | null = null

    for (const id of sectionIds) {
      const element = document.getElementById(id)
      if (!element) continue
      if (element.getBoundingClientRect().top - offset <= 0) current = id
      else break
    }

    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
    if (atBottom && current) current = sectionIds[sectionIds.length - 1]

    setActiveId((previous) => (previous === current ? previous : current))
  })

  /** Marca a categoria como ativa imediatamente (ao tocar no menu) e pausa o spy durante a rolagem. */
  const activate = useCallback((id: string, lockMs = 900) => {
    lockedUntil.current = Date.now() + lockMs
    setActiveId(id)
  }, [])

  const resolved = activeId && sectionIds.includes(activeId) ? activeId : null
  return { activeId: resolved, activate }
}
