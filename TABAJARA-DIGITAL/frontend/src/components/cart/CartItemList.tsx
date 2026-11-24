import { useState } from 'react'
import { Trash2 } from 'lucide-react'

import { useCart } from '../../hooks/useCart'
import { MAX_ITEM_QUANTITY } from '../../types/cart'
import { cx } from '../../utils/dom'
import { formatPrice } from '../../utils/format'
import { ProductImage } from '../ui/ProductImage'
import { QuantityStepper } from '../ui/QuantityStepper'
import styles from './CartItemList.module.css'
import { Money } from '../ui/Money'

interface CartItemListProps {
  /** "cards": cada item num cartão (página do carrinho). */
  variant?: 'list' | 'cards'
  /** Chamado depois da animação de saída, no lugar de remover direto (ex.: para oferecer "Desfazer"). */
  onRemove?: (productId: string) => void
}

const LEAVE_MS = 300

/** Itens do carrinho com quantidade editável. Usado no painel do carrinho e na página /carrinho. */
export function CartItemList({ variant = 'list', onRemove }: CartItemListProps) {
  const { items, setQuantity, remove } = useCart()
  const [leaving, setLeaving] = useState<string[]>([])

  // O item desliza e some antes de sair da lista (sem "pulo" seco).
  const removeAnimated = (productId: string) => {
    if (leaving.includes(productId)) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finish = () => {
      setLeaving((ids) => ids.filter((id) => id !== productId))
      if (onRemove) onRemove(productId)
      else remove(productId)
    }
    if (reduced) return finish()
    setLeaving((ids) => [...ids, productId])
    window.setTimeout(finish, LEAVE_MS)
  }

  return (
    <ul className={cx(styles.list, variant === 'cards' && styles.cards)}>
      {items.map(({ product, quantity }) => (
        <li key={product.id} className={cx(styles.item, leaving.includes(product.id) && styles.leaving)}>
          {product.image_url ? (
            <ProductImage src={product.image_url} alt="" className={styles.thumb} muted={!product.available} />
          ) : (
            <span className={`${styles.thumb} ${styles.thumbEmpty}`} aria-hidden="true">
              ✦
            </span>
          )}

          <div className={styles.info}>
            <div className={styles.topRow}>
              <span className={styles.name}>{product.name}</span>
              <span key={quantity} className={styles.lineTotal}>
                <Money cents={product.price_cents * quantity} />
              </span>
            </div>
            {product.available && quantity > 1 && (
              <span className={styles.unit}>
                {quantity} × {formatPrice(product.price_cents)}
              </span>
            )}
            {!product.available && (
              <span className={`${styles.unit} ${styles.warning}`}>
                Indisponível no momento · remova para continuar
              </span>
            )}
            <div className={styles.controls}>
              <QuantityStepper
                size="sm"
                value={quantity}
                min={1}
                max={MAX_ITEM_QUANTITY}
                onChange={(value) => setQuantity(product.id, value)}
                label={product.name}
              />
              <button
                type="button"
                className={styles.remove}
                onClick={() => removeAnimated(product.id)}
                aria-label={`Remover ${product.name} do carrinho`}
              >
                <Trash2 size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
