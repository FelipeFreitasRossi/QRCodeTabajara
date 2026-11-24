import type { CSSProperties, ReactNode } from 'react'

import { useInView } from '../../hooks/useInView'
import { cx } from '../../utils/dom'
import styles from './Reveal.module.css'

interface RevealProps {
  children: ReactNode
  /** Atraso em milissegundos, para criar o efeito em cascata. */
  delay?: number
  className?: string
}

/** Faz o conteúdo surgir suavemente quando entra na tela durante o scroll. */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={cx(styles.reveal, inView && styles.visible, className)}
      data-visible={inView}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}
