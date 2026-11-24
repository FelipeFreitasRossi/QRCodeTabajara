import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useCart } from '../../hooks/useCart'
import { useClubCart } from '../../hooks/useClubCart'
import { cx } from '../../utils/dom'
import styles from './CartIconButton.module.css'

interface CartIconButtonProps {
  /** Abre o painel do carrinho (cardápio). */
  onClick?: () => void
  /** Ou navega para uma página (ex.: /carrinho). */
  to?: string
  /** Mostra o ícone mesmo destacado como "página atual". */
  current?: boolean
}

/** Ícone de sacola com a quantidade de itens. Fica no topo de todas as páginas do site. */
export function CartIconButton({ onClick, to, current = false }: CartIconButtonProps) {
  const { count: productCount } = useCart()
  const { perksCount } = useClubCart()
  const count = productCount + perksCount
  const label = count === 0 ? 'Carrinho vazio' : `Carrinho: ${count} ${count === 1 ? 'item' : 'itens'}`

  const content = (
    <>
      <ShoppingBag size={20} strokeWidth={1.75} aria-hidden="true" />
      {count > 0 && (
        <span key={count} className={styles.badge} aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </>
  )

  const className = cx(styles.button, count > 0 && styles.filled, current && styles.current)

  if (to) {
    return (
      <Link
        to={to}
        className={className}
        aria-label={label}
        aria-current={current ? 'page' : undefined}
        data-cart-target=""
      >
        {content}
      </Link>
    )
  }
  return (
    <button type="button" className={className} onClick={onClick} aria-label={label} data-cart-target="">
      {content}
    </button>
  )
}
