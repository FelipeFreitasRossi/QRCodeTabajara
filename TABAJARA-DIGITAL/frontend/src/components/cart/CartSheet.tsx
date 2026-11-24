import { useEffect, useId, useState } from 'react'
import { ArrowRight, Gift, Receipt, ShoppingBag, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { useCart } from '../../hooks/useCart'
import { useClubCart } from '../../hooks/useClubCart'
import { readJSON, STORAGE_KEYS } from '../../utils/storage'
import { Button } from '../ui/Button'
import { Ornament } from '../ui/Ornament'
import { Sheet } from '../ui/Sheet'
import { CartItemList } from './CartItemList'
import styles from './CartSheet.module.css'
import { Money } from '../ui/Money'

interface CartSheetProps {
  open: boolean
  onClose: () => void
  onExited: () => void
}

/** Resumo rápido do carrinho, aberto pela barra flutuante. "Finalizar pedido" leva à página /carrinho. */
export function CartSheet({ open, onClose, onExited }: CartSheetProps) {
  const titleId = useId()
  const navigate = useNavigate()
  const { items, count: productCount, totalCents, clear } = useCart()
  const { perksCount, pointsCost } = useClubCart()
  const count = productCount + perksCount
  const hasContent = items.length > 0 || perksCount > 0
  const [confirmClear, setConfirmClear] = useState(false)
  const [lastOrder] = useState(() => readJSON<string | null>(STORAGE_KEYS.lastOrder, null))
  const hasUnavailable = items.some((item) => !item.product.available)

  useEffect(() => {
    if (!confirmClear) return
    const timer = window.setTimeout(() => setConfirmClear(false), 3000)
    return () => window.clearTimeout(timer)
  }, [confirmClear])

  const handleClear = () => {
    if (confirmClear) {
      clear()
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
    }
  }

  const footer = hasContent ? (
    <div className={styles.footer}>
      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>Total</span>
        <span className={styles.totalValue}>
          <Money cents={totalCents} />
        </span>
      </div>
      <Button
        variant="primary"
        block
        disabled={hasUnavailable}
        onClick={() => navigate('/carrinho')}
        icon={<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />}
      >
        Finalizar pedido
      </Button>
      {hasUnavailable && <p className={styles.hint}>Remova os itens indisponíveis para continuar.</p>}
      <div className={styles.footerActions}>
        <Button variant="ghost" onClick={handleClear} icon={<Trash2 size={16} aria-hidden="true" />}>
          {confirmClear ? 'Toque de novo para limpar' : 'Limpar'}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Continuar escolhendo
        </Button>
      </div>
    </div>
  ) : undefined

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onExited={onExited}
      labelledBy={titleId}
      closeLabel="Fechar carrinho"
      footer={footer}
    >
      <div className={styles.content}>
        <Ornament align="left" className={styles.ornament} />
        <h2 id={titleId} className={styles.title}>
          Seu pedido
        </h2>
        <p className={styles.subtitle}>
          {count === 0 ? 'Nenhum item adicionado' : `${count} ${count === 1 ? 'item' : 'itens'} no carrinho`}
        </p>

        {perksCount > 0 && (
          <Link to="/carrinho" className={styles.perks}>
            <Gift size={16} aria-hidden="true" />
            <span>
              {perksCount} {perksCount === 1 ? 'vantagem' : 'vantagens'} do Clube no pedido
              {pointsCost > 0 && <> · −{pointsCost.toLocaleString('pt-BR')} pts</>}
            </span>
          </Link>
        )}

        {items.length === 0 && perksCount === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden="true">
              <ShoppingBag size={28} strokeWidth={1.25} />
            </span>
            <p className={styles.emptyTitle}>Seu carrinho está vazio</p>
            <p className={styles.emptyText}>Explore o cardápio e adicione seus pratos preferidos.</p>
            <Button variant="outline" onClick={onClose}>
              Ver o cardápio
            </Button>
            {lastOrder && (
              <Link to={`/pedido/${lastOrder}`} className={styles.lastOrder}>
                <Receipt size={16} strokeWidth={1.5} aria-hidden="true" />
                Acompanhar meu último pedido
              </Link>
            )}
          </div>
        ) : (
          items.length > 0 && <CartItemList />
        )}
      </div>
    </Sheet>
  )
}
