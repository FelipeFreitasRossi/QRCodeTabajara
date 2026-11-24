import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { CartIconButton } from '../cart/CartIconButton'
import { Logo } from '../ui/Logo'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  backTo?: string
  backLabel?: string
  /** Destaca o ícone do carrinho (quando a página atual é o carrinho). */
  cartCurrent?: boolean
}

/** Cabeçalho simples das páginas internas do site (carrinho, acompanhamento do pedido). */
export function PageHeader({ backTo = '/cardapio', backLabel = 'Cardápio', cartCurrent = false }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to={backTo} className={styles.back}>
          <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>{backLabel}</span>
        </Link>
        <Link to="/cardapio" className={styles.brand} aria-label="Tabajara, voltar ao cardápio">
          <Logo size="sm" />
        </Link>
        <div className={styles.end}>
          <CartIconButton to="/carrinho" current={cartCurrent} />
        </div>
      </div>
    </header>
  )
}
