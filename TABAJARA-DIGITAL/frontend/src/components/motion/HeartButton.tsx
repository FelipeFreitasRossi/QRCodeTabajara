import { useState } from 'react'
import { Heart } from 'lucide-react'

import { useFavorites } from '../../hooks/useFavorites'
import { cx } from '../../utils/dom'
import styles from './HeartButton.module.css'

interface HeartButtonProps {
  productId: string
  productName: string
  /** sm: sobre fotos e cartões · lg: na página do produto */
  size?: 'sm' | 'lg'
  /** "glass" com fundo desfocado (sobre fotos) ou "plain" (sobre o fundo escuro). */
  tone?: 'glass' | 'plain'
  className?: string
}

const PARTICLES = 10

/** Coração de favoritar com efeito "pop": encolhe, explode em brilhos dourados e volta. */
export function HeartButton({ productId, productName, size = 'sm', tone = 'glass', className }: HeartButtonProps) {
  const { isFavorite, toggle } = useFavorites()
  const active = isFavorite(productId)
  const [burst, setBurst] = useState(0)

  const onClick = (event: { stopPropagation(): void; preventDefault(): void }) => {
    event.stopPropagation()
    event.preventDefault()
    const added = toggle(productId, productName)
    if (added) setBurst((n) => n + 1)
    if (added && 'vibrate' in navigator) navigator.vibrate?.(12)
  }

  return (
    <button
      type="button"
      className={cx(styles.button, styles[size], styles[tone], active && styles.active, className)}
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Remover ${productName} dos favoritos` : `Favoritar ${productName}`}
    >
      <span key={`h${burst}`} className={cx(styles.icon, burst > 0 && active && styles.pop)}>
        <Heart size={size === 'lg' ? 22 : 17} strokeWidth={2} aria-hidden="true" />
      </span>
      {burst > 0 && active && (
        <span key={`b${burst}`} className={styles.burst} aria-hidden="true">
          <span className={styles.ring} />
          {Array.from({ length: PARTICLES }, (_, i) => (
            <span
              key={i}
              className={styles.particle}
              style={{
                ['--a' as string]: `${(360 / PARTICLES) * i + (i % 2 ? 12 : 0)}deg`,
                ['--d' as string]: i % 2 ? '1' : '0.72',
              }}
            />
          ))}
        </span>
      )}
    </button>
  )
}
