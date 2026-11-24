import { ShoppingBag } from 'lucide-react'

import { useCart } from '../../hooks/useCart'
import styles from './CartBar.module.css'
import { Money } from '../ui/Money'

interface CartBarProps {
  onOpen: () => void
}

/** Barra flutuante na parte de baixo da tela, visível quando há itens no carrinho. */
export function CartBar({ onOpen }: CartBarProps) {
  const { count, totalCents } = useCart()
  if (count === 0) return null

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.bar}
        onClick={onOpen}
        aria-label={`Ver carrinho: ${count} ${count === 1 ? 'item' : 'itens'}, total $<Money cents={totalCents} variant="plain" />`}
      >
        <span className={styles.icon} aria-hidden="true">
          <ShoppingBag size={20} strokeWidth={1.75} />
          <span key={count} className={styles.badge}>
            {count}
          </span>
        </span>
        <span className={styles.label} aria-hidden="true">
          Ver carrinho
        </span>
        <span className={styles.total} aria-hidden="true">
          <Money cents={totalCents} variant="plain" />
        </span>
      </button>
    </div>
  )
}
