import { useRef } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

import type { Product } from '../../types/menu'
import { cx, prefersReducedMotion } from '../../utils/dom'
import { HeartButton } from '../motion/HeartButton'
import { Ornament } from '../ui/Ornament'
import { ProductImage } from '../ui/ProductImage'
import { Reveal } from '../ui/Reveal'
import styles from './FeaturedRail.module.css'
import { Money } from '../ui/Money'

interface FeaturedRailProps {
  products: Product[]
  onSelect: (product: Product) => void
}

/** Carrossel horizontal dos produtos em destaque, com encaixe suave ao deslizar. */
export function FeaturedRail({ products, onSelect }: FeaturedRailProps) {
  const trackRef = useRef<HTMLUListElement>(null)

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector('li')
    const step = card ? card.getBoundingClientRect().width + 16 : track.clientWidth * 0.8
    track.scrollBy({ left: direction * step, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <section className={styles.section} aria-labelledby="destaques-titulo">
      <Reveal className={styles.header}>
        <div>
          <Ornament align="left" className={styles.ornament} />
          <h2 id="destaques-titulo" className={styles.title}>
            Destaque <em>da Casa</em>
          </h2>
        </div>
        <div className={styles.arrows}>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => scrollByCard(-1)}
            aria-label="Destaque anterior"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <button type="button" className={styles.arrow} onClick={() => scrollByCard(1)} aria-label="Próximo destaque">
            <ChevronRight size={20} strokeWidth={1.5} />
          </button>
        </div>
      </Reveal>

      <ul ref={trackRef} className={styles.track}>
        {products.map((product, index) => {
          const hasImage = Boolean(product.image_url)
          return (
            <li key={product.id} className={styles.item}>
              <Reveal delay={Math.min(index, 3) * 90} className={styles.revealFill}>
                <button
                  type="button"
                  className={cx(styles.card, hasImage ? styles.photoCard : styles.plainCard)}
                  onClick={() => onSelect(product)}
                >
                  {hasImage && (
                    <>
                      <ProductImage
                        src={product.image_url}
                        alt=""
                        className={styles.image}
                        eager={index < 2}
                        muted={!product.available}
                      />
                      <span className={styles.shade} aria-hidden="true" />
                    </>
                  )}

                  <span className={styles.number} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span className={styles.info}>
                    {!product.available && <span className={styles.unavailable}>Indisponível</span>}
                    <span className={styles.name}>{product.name}</span>
                    {!hasImage && product.description && (
                      <span className={styles.description}>{product.description}</span>
                    )}
                    <span className={styles.footer}>
                      <span className={styles.price}>
                        <Money cents={product.price_cents} />
                      </span>
                      <span className={styles.more} aria-hidden="true">
                        <ArrowRight size={16} strokeWidth={1.5} />
                      </span>
                    </span>
                  </span>
                </button>
                <HeartButton productId={product.id} productName={product.name} className={styles.heart} />
              </Reveal>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
