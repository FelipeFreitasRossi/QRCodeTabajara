import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { brand } from '../../config/brand'
import { useScrollFrame } from '../../hooks/useScrollFrame'
import { cx } from '../../utils/dom'
import { Logo } from '../ui/Logo'
import { Ornament } from '../ui/Ornament'
import styles from './MenuHero.module.css'

interface MenuHeroProps {
  onExplore: () => void
}

const SPARKS = Array.from({ length: 12 }, (_, i) => i)

/**
 * Capa do cardápio. Fundo com brilho de brasa e fagulhas subindo (ou foto, se
 * configurada em config/brand.ts). Ao rolar, o conteúdo sobe e esmaece (parallax).
 */
export function MenuHero({ onExplore }: MenuHeroProps) {
  const heroRef = useRef<HTMLElement>(null)
  const [photoReady, setPhotoReady] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  const showPhoto = Boolean(brand.heroImage) && !photoFailed

  useScrollFrame((scrollY) => {
    const hero = heroRef.current
    if (!hero) return
    const progress = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight || 1)))
    hero.style.setProperty('--hero-progress', progress.toFixed(3))
  })

  return (
    <section id="topo" ref={heroRef} className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.backdrop} aria-hidden="true">
        {showPhoto && brand.heroImage && (
          <img
            src={brand.heroImage}
            alt=""
            className={cx(styles.photo, photoReady && styles.photoReady)}
            onLoad={() => setPhotoReady(true)}
            onError={() => setPhotoFailed(true)}
          />
        )}
        <span className={styles.glow} />
        <span className={styles.sparks}>
          {SPARKS.map((i) => (
            <span key={i} className={styles.spark} />
          ))}
        </span>
        <span className={styles.vignette} />
      </div>

      <div className={styles.content}>
        <Ornament className={styles.ornamentTop} />
        <span className={styles.eyebrow}>Seja bem-vindo ao</span>
        <h1 id="hero-title" className={styles.title}>
          <Logo size="lg" />
        </h1>
        <p className={styles.subtitle}>
          <span>Restaurante</span>
          <span className={styles.dot} aria-hidden="true" />
          <span>{brand.city}</span>
        </p>
      </div>

      <button type="button" className={styles.cue} onClick={onExplore}>
        <span>Ver o cardápio</span>
        <ChevronDown size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </section>
  )
}
