import { useMemo, useRef } from 'react'
import { Plus } from 'lucide-react'

import { useCart } from '../../hooks/useCart'
import type { Category, Product } from '../../types/menu'
import { formatPrice } from '../../utils/format'
import { ProductImage } from '../ui/ProductImage'
import styles from './CartSuggestions.module.css'
import { Money } from '../ui/Money'

interface CartSuggestionsProps {
  categories: Category[]
  /** `source`: foto do item, de onde a animação voa até a sacola. */
  onAdd: (product: Product, source: HTMLElement | null) => void
}

// Categorias que costumam completar um pedido, na ordem de prioridade (pelo endereço da categoria).
const PRIORITY = [/bebida|drink|suco|cerveja|vinho/, /acompanha|guarni/, /sobremesa|doce/, /petisco|porc|entrada/]
const rank = (slug: string) => {
  const index = PRIORITY.findIndex((re) => re.test(slug))
  return index === -1 ? PRIORITY.length : index
}

/**
 * "Para acompanhar": sugestões reais do cardápio (bebidas, acompanhamentos,
 * sobremesas) que ainda não estão no carrinho. Um toque adiciona.
 */
export function CartSuggestions({ categories, onAdd }: CartSuggestionsProps) {
  const { items } = useCart()
  const refs = useRef(new Map<string, HTMLElement>())
  const inCart = useMemo(() => new Set(items.map((i) => i.product.id)), [items])
  const cartCategories = useMemo(
    () => new Set(categories.filter((c) => c.products.some((p) => inCart.has(p.id))).map((c) => c.id)),
    [categories, inCart],
  )

  const suggestions = useMemo(() => {
    const pick: Product[] = []
    // primeiro: categorias complementares que o cliente ainda não pediu
    const ordered = [...categories].sort((a, b) => {
      // categorias que o cliente ainda não pediu vêm antes das que ele já tem no carrinho
      const score = (c: Category) => rank(c.slug) + (cartCategories.has(c.id) ? 10 : 0)
      return score(a) - score(b)
    })
    for (const category of ordered) {
      const options = category.products.filter((p) => p.available && !inCart.has(p.id))
      // um ou dois por categoria, destaques primeiro, para variar
      options.sort((a, b) => Number(b.featured) - Number(a.featured))
      pick.push(...options.slice(0, 2))
      if (pick.length >= 8) break
    }
    return pick.slice(0, 8)
  }, [categories, inCart, cartCategories])

  if (suggestions.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="sugestoes-titulo">
      <div className={styles.head}>
        <h2 id="sugestoes-titulo" className={styles.title}>
          Para acompanhar
        </h2>
        <span className={styles.hint}>Toque no + para adicionar</span>
      </div>
      <ul className={styles.track}>
        {suggestions.map((product, index) => (
          <li key={product.id} className={styles.item} style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}>
            <button
              type="button"
              className={styles.card}
              onClick={() => onAdd(product, refs.current.get(product.id) ?? null)}
              aria-label={`Adicionar ${product.name}, ${formatPrice(product.price_cents)}`}
            >
              <span
                className={styles.media}
                ref={(el: HTMLSpanElement | null) => {
                  if (el) refs.current.set(product.id, el)
                  else refs.current.delete(product.id)
                }}
              >
                <ProductImage src={product.image_url} alt="" className={styles.image} />
                <span className={styles.plus} aria-hidden="true">
                  <Plus size={16} strokeWidth={2.5} />
                </span>
              </span>
              <span className={styles.name}>{product.name}</span>
              <span className={styles.price}>
                <Money cents={product.price_cents} variant="plain" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
