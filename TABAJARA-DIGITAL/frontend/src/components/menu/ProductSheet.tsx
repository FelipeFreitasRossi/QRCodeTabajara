import { useId, useRef, useState } from 'react'
import { Info, ShoppingBag, TriangleAlert } from 'lucide-react'

import { MAX_ITEM_QUANTITY } from '../../types/cart'
import type { Product } from '../../types/menu'
import { HeartButton } from '../motion/HeartButton'
import { Button } from '../ui/Button'
import { Ornament } from '../ui/Ornament'
import { ProductImage } from '../ui/ProductImage'
import { QuantityStepper } from '../ui/QuantityStepper'
import { Sheet } from '../ui/Sheet'
import styles from './ProductSheet.module.css'
import { Money } from '../ui/Money'

interface ProductSheetProps {
  product: Product
  open: boolean
  onClose: () => void
  onExited: () => void
  /** `source`: elemento de onde a animação "voa" até o carrinho. */
  onAdd: (product: Product, quantity: number, source: HTMLElement | null) => void
}

/** Detalhes do produto com seletor de quantidade e botão "Adicionar ao carrinho". */
export function ProductSheet({ product, open, onClose, onExited, onAdd }: ProductSheetProps) {
  const titleId = useId()
  const [quantity, setQuantity] = useState(1)
  const unavailable = !product.available
  const hasImage = Boolean(product.image_url)
  const imageRef = useRef<HTMLDivElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)

  const footer = unavailable ? (
    <Button variant="primary" block disabled>
      Indisponível no momento
    </Button>
  ) : (
    <div className={styles.actions}>
      <div className={styles.summary}>
        <QuantityStepper value={quantity} onChange={setQuantity} max={MAX_ITEM_QUANTITY} label={product.name} />
        <div className={styles.subtotal}>
          <span className={styles.subtotalLabel}>Subtotal</span>
          <span className={styles.subtotalValue}>
            <Money cents={product.price_cents * quantity} />
          </span>
        </div>
      </div>
      <Button
        variant="primary"
        block
        icon={<ShoppingBag size={18} strokeWidth={1.75} aria-hidden="true" />}
        ref={addRef}
        onClick={() => onAdd(product, quantity, imageRef.current ?? addRef.current)}
      >
        Adicionar ao carrinho
      </Button>
    </div>
  )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onExited={onExited}
      labelledBy={titleId}
      closeLabel="Fechar detalhes"
      closeStyle={hasImage ? 'floating' : 'plain'}
      footer={footer}
    >
      {hasImage && (
        <div ref={imageRef} className={styles.media}>
          <ProductImage src={product.image_url} alt={product.name} className={styles.image} eager muted={unavailable} />
          <HeartButton productId={product.id} productName={product.name} size="lg" className={styles.heartOnImage} />
        </div>
      )}

      <div className={hasImage ? styles.content : `${styles.content} ${styles.contentNoImage}`}>
        {product.featured ? (
          <span className={styles.featured}>✦ Destaque da Casa</span>
        ) : (
          !hasImage && <Ornament align="left" className={styles.ornament} />
        )}
        <div className={styles.titleRow}>
          <h2 id={titleId} className={styles.name}>
            {product.name}
          </h2>
          {!hasImage && <HeartButton productId={product.id} productName={product.name} size="lg" tone="plain" />}
        </div>
        <p className={styles.price}>
          <Money cents={product.price_cents} />
        </p>

        {unavailable && (
          <p className={styles.notice} role="status">
            <Info size={16} aria-hidden="true" />
            Este item está indisponível no momento.
          </p>
        )}

        {product.description && <p className={styles.description}>{product.description}</p>}

        {product.ingredients.length > 0 && (
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>Ingredientes</h3>
            <p className={styles.ingredients}>{product.ingredients.join(' · ')}</p>
          </div>
        )}

        <div className={styles.block}>
          <h3 className={styles.blockTitle}>Alergênicos</h3>
          {product.allergens.length > 0 ? (
            <ul className={styles.allergens}>
              {product.allergens.map((allergen) => (
                <li key={allergen} className={styles.allergen}>
                  <TriangleAlert size={14} aria-hidden="true" />
                  {allergen}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Nenhum alergênico informado.</p>
          )}
          <p className={styles.disclaimer}>
            Tem alguma alergia ou restrição? Confirme com nossa equipe antes do pedido.
          </p>
        </div>
      </div>
    </Sheet>
  )
}
