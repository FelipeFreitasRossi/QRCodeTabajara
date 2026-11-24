import { useMemo } from 'react'
import { Heart } from 'lucide-react'

import { useFavorites } from '../../hooks/useFavorites'
import type { Product } from '../../types/menu'
import { ProductImage } from '../ui/ProductImage'
import styles from './FavoritesRail.module.css'
import { Money } from '../ui/Money'

interface FavoritesRailProps {
  products: Product[]
  onSelect: (product: Product) => void
}

/** "Seus favoritos": atalhos rápidos para os pratos que o cliente marcou com o coração. */
export function FavoritesRail({ products, onSelect }: FavoritesRailProps) {
  const { ids } = useFavorites()
  const favorites = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]))
    return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p))
  }, [ids, products])

  if (favorites.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="favoritos-titulo">
      <h2 id="favoritos-titulo" className={styles.title}>
        <Heart size={15} aria-hidden="true" className={styles.heart} />
        Seus favoritos
        <span className={styles.count}>{favorites.length}</span>
      </h2>
      <ul className={styles.track}>
        {favorites.map((product) => (
          <li key={product.id} className={styles.item}>
            <button type="button" className={styles.chip} onClick={() => onSelect(product)}>
              <ProductImage src={product.image_url} alt="" className={styles.thumb} muted={!product.available} />
              <span className={styles.text}>
                <span className={styles.name}>{product.name}</span>
                <span className={styles.price}>
                  {product.available ? <Money cents={product.price_cents} variant="plain" /> : 'Indisponível'}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
