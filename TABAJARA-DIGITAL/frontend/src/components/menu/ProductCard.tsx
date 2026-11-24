import { TriangleAlert } from 'lucide-react'

import { useCart } from '../../hooks/useCart'
import type { Product } from '../../types/menu'
import { cx } from '../../utils/dom'
import { joinList } from '../../utils/format'
import { HeartButton } from '../motion/HeartButton'
import { ProductImage } from '../ui/ProductImage'
import styles from './ProductCard.module.css'
import { Money } from '../ui/Money'

interface ProductCardProps {
  product: Product
  onSelect: (product: Product) => void
}

/**
 * Item do cardápio no estilo de menu impresso: nome, linha pontilhada e preço.
 * A foto aparece à direita somente quando o produto tiver uma cadastrada.
 */
export function ProductCard({ product, onSelect }: ProductCardProps) {
  const unavailable = !product.available
  const inCart = useCart().quantityOf(product.id)
  const hasImage = Boolean(product.image_url)

  return (
    <div className={cx(styles.root, hasImage && styles.rootWithImage)}>
      <button
        type="button"
        className={cx(styles.card, hasImage && styles.withImage, unavailable && styles.unavailable)}
        onClick={() => onSelect(product)}
      >
        <span className={styles.body}>
          <span className={styles.heading}>
            <span className={styles.name}>
              {product.featured && (
                <>
                  <span className={styles.star} aria-hidden="true">
                    ✦
                  </span>
                  <span className="visually-hidden">Destaque: </span>
                </>
              )}
              {product.name}
            </span>
            <span className={styles.leader} aria-hidden="true" />
            <span className={styles.price}>
              <Money cents={product.price_cents} />
            </span>
          </span>

          {product.description && <span className={styles.description}>{product.description}</span>}

          {(product.allergens.length > 0 || unavailable || inCart > 0) && (
            <span className={styles.meta}>
              {inCart > 0 && <span className={styles.inCart}>{inCart} no carrinho</span>}
              {unavailable && <span className={styles.badge}>Indisponível no momento</span>}
              {product.allergens.length > 0 && (
                <span className={styles.allergens}>
                  <TriangleAlert size={12} strokeWidth={2} aria-hidden="true" />
                  Contém {joinList(product.allergens.map((item) => item.toLowerCase()))}
                </span>
              )}
            </span>
          )}
        </span>

        {hasImage && <ProductImage src={product.image_url} alt="" className={styles.thumb} muted={unavailable} />}
      </button>
      <HeartButton
        productId={product.id}
        productName={product.name}
        tone={hasImage ? 'glass' : 'plain'}
        className={styles.heart}
      />
    </div>
  )
}
