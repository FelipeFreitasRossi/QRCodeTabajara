import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { cx } from '../../utils/dom'
import styles from './Sheet.module.css'

interface SheetProps {
  open: boolean
  onClose: () => void
  /** Chamado ao fim da animação de saída, para desmontar o painel. */
  onExited: () => void
  /** id do título do painel (acessibilidade). */
  labelledBy: string
  closeLabel?: string
  /** "floating": botão fechar com fundo, para ficar sobre uma foto. */
  closeStyle?: 'floating' | 'plain'
  className?: string
  /** Área fixa na parte de baixo (ex.: botão "Adicionar ao carrinho"). */
  footer?: ReactNode
  children: ReactNode
}

const DRAG_CLOSE_DISTANCE = 110
const FOCUSABLE = 'button:not([disabled]), [href], input, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Painel que no celular sobe da parte de baixo (pode ser arrastado para baixo
 * para fechar) e em telas maiores abre como janela central.
 */
export function Sheet({
  open,
  onClose,
  onExited,
  labelledBy,
  closeLabel = 'Fechar',
  closeStyle = 'plain',
  className,
  footer,
  children,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const drag = useRef({ startY: 0, distance: 0, active: false })

  // Foco no botão fechar ao abrir; devolve o foco a quem abriu ao fechar.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus({ preventScroll: true })
    return () => previous?.focus({ preventScroll: true })
  }, [])

  // Esc fecha; Tab fica preso dentro do painel (acessibilidade).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const items = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return
    drag.current = { startY: event.clientY, distance: 0, active: true }
    event.currentTarget.setPointerCapture(event.pointerId)
    panelRef.current?.style.setProperty('transition', 'none')
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active || !panelRef.current) return
    const distance = Math.max(0, event.clientY - drag.current.startY)
    drag.current.distance = distance
    panelRef.current.style.transform = `translate3d(0, ${distance}px, 0)`
  }

  const onPointerEnd = () => {
    if (!drag.current.active || !panelRef.current) return
    drag.current.active = false
    panelRef.current.style.removeProperty('transition')
    if (drag.current.distance > DRAG_CLOSE_DISTANCE) onClose()
    else panelRef.current.style.transform = ''
  }

  return createPortal(
    <div className={styles.root} data-state={open ? 'open' : 'closed'}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        className={cx(styles.panel, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && !open) onExited()
        }}
      >
        <div
          className={styles.grabZone}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          aria-hidden="true"
        >
          <span className={styles.grabber} />
        </div>

        <button
          ref={closeRef}
          type="button"
          className={cx(styles.close, closeStyle === 'floating' && styles.closeFloating)}
          onClick={onClose}
          aria-label={closeLabel}
        >
          <X size={20} strokeWidth={1.75} />
        </button>

        <div className={styles.scroll}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
