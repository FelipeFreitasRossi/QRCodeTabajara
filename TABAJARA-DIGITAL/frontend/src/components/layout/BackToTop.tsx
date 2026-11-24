import { useRef } from 'react'
import { ArrowUp } from 'lucide-react'

import { useCart } from '../../hooks/useCart'
import { useScrollFrame } from '../../hooks/useScrollFrame'
import { cx, prefersReducedMotion } from '../../utils/dom'
import styles from './BackToTop.module.css'

/** Botão flutuante que aparece depois de rolar bastante o cardápio. */
export function BackToTop() {
  const ref = useRef<HTMLButtonElement>(null)
  const cartVisible = useCart().count > 0

  useScrollFrame((scrollY) => {
    const button = ref.current
    if (!button) return
    const visible = scrollY > window.innerHeight * 1.4
    button.dataset.visible = String(visible)
    button.tabIndex = visible ? 0 : -1
  })

  return (
    <button
      ref={ref}
      type="button"
      className={cx(styles.button, cartVisible && styles.raised)}
      data-visible="false"
      tabIndex={-1}
      aria-label="Voltar ao topo"
      onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })}
    >
      <ArrowUp size={20} strokeWidth={1.75} />
    </button>
  )
}
