import type { Category, Product } from '../../types/menu'
import { Reveal } from '../ui/Reveal'
import { ProductCard } from './ProductCard'
import { SectionCover } from './SectionCover'
import styles from './CategorySection.module.css'

interface CategorySectionProps {
  id: string
  index: number
  category: Category
  onSelect: (product: Product) => void
}

export function CategorySection({ id, index, category, onSelect }: CategorySectionProps) {
  const titleId = `${id}-titulo`
  const count = category.products.length

  return (
    <section id={id} className={styles.section} aria-labelledby={titleId}>
      {/* Foto da seção , alternando de lado */}
      {category.image_url && <SectionCover src={category.image_url} side={index % 2 === 0 ? 'right' : 'left'} />}
      <Reveal className={styles.header}>
        <span className={styles.kicker}>
          <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
          <span className={styles.rule} aria-hidden="true" />
          <span className={styles.count}>
            {count} {count === 1 ? 'item' : 'itens'}
          </span>
        </span>
        <h2 id={titleId} className={styles.title}>
          {category.name}
        </h2>
        {category.description && <p className={styles.description}>{category.description}</p>}
      </Reveal>

      <ul className={styles.list}>
        {category.products.map((product, i) => (
          <li key={product.id} className={styles.item}>
            <Reveal delay={(i % 4) * 70}>
              <ProductCard product={product} onSelect={onSelect} />
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}
