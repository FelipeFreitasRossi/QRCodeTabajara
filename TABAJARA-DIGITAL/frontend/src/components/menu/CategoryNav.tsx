import { useEffect, useRef } from 'react'

import { useScrollFrame } from '../../hooks/useScrollFrame'
import type { Category } from '../../types/menu'
import { cx, prefersReducedMotion, sectionIdFor } from '../../utils/dom'
import styles from './CategoryNav.module.css'

interface CategoryNavProps {
  categories: Category[]
  activeId: string | null
  onSelect: (categorySlug: string) => void
}

/**
 * Barra de categorias que gruda no topo ao rolar. Um traço dourado desliza até
 * a categoria visível na tela, que também é centralizada automaticamente.
 */
export function CategoryNav({ categories, activeId, onSelect }: CategoryNavProps) {
  const navRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)

  useScrollFrame(() => {
    const nav = navRef.current
    if (!nav) return
    const header = document.querySelector<HTMLElement>('[data-sticky="header"]')
    nav.dataset.stuck = String(nav.getBoundingClientRect().top <= (header?.offsetHeight ?? 0) + 1)
  })

  useEffect(() => {
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator) return

    const place = (smoothScroll: boolean) => {
      const chip = activeId ? list.querySelector<HTMLElement>(`[data-target="${activeId}"]`) : null
      if (!chip) {
        indicator.style.opacity = '0'
        return
      }
      const inset = 14 // acompanha o padding horizontal do botão
      indicator.style.opacity = '1'
      indicator.style.width = `${chip.offsetWidth - inset * 2}px`
      indicator.style.transform = `translate3d(${chip.offsetLeft + inset}px, 0, 0)`

      const left = chip.offsetLeft - (list.clientWidth - chip.offsetWidth) / 2
      list.scrollTo({ left, behavior: smoothScroll && !prefersReducedMotion() ? 'smooth' : 'auto' })
    }

    place(true)
    const onResize = () => place(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [activeId, categories])

  if (categories.length === 0) return null

  return (
    <nav ref={navRef} className={styles.nav} data-sticky="nav" data-stuck="false" aria-label="Categorias do cardápio">
      <div ref={listRef} className={styles.list}>
        <ul className={styles.tabs}>
          {categories.map((category) => {
            const targetId = sectionIdFor(category.slug)
            const active = targetId === activeId
            return (
              <li key={category.id}>
                <button
                  type="button"
                  data-target={targetId}
                  className={cx(styles.tab, active && styles.active)}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onSelect(category.slug)}
                >
                  {category.name}
                </button>
              </li>
            )
          })}
        </ul>
        <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
      </div>
    </nav>
  )
}
