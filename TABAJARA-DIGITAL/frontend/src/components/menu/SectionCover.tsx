import { useRef } from 'react'

import { useInView } from '../../hooks/useInView'
import { useScrollFrame } from '../../hooks/useScrollFrame'
import { resolveAssetUrl } from '../../services/api'
import { prefersReducedMotion } from '../../utils/dom'
import styles from './SectionCover.module.css'

interface SectionCoverProps {
  src: string
  /** Lado da foto; as seções alternam (direita, esquerda, direita…). */
  side: 'left' | 'right'
}

/**
 * Foto decorativa da seção do cardápio ("alternating corner image gradient"):
 * ocupa ~25% da largura da seção, encostada na borda da tela, e some num degradê
 * em direção ao conteúdo. Surge suavemente e tem um leve parallax ao rolar.
 */
export function SectionCover({ src, side }: SectionCoverProps) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.02, rootMargin: '0px 0px -5% 0px' })
  const imgRef = useRef<HTMLImageElement>(null)
  const url = resolveAssetUrl(src)

  // parallax: a foto anda um pouco mais devagar que a página
  useScrollFrame(() => {
    const box = ref.current
    const img = imgRef.current
    if (!box || !img || prefersReducedMotion()) return
    const r = box.getBoundingClientRect()
    if (r.bottom < -200 || r.top > window.innerHeight + 200) return
    const offset = (r.top + r.height / 2 - window.innerHeight / 2) * -0.08
    img.style.setProperty('--parallax', `${offset.toFixed(1)}px`)
  })

  if (!url) return null
  return (
    <div ref={ref} className={`${styles.cover} ${styles[side]}`} data-visible={inView} aria-hidden="true">
      <img ref={imgRef} src={url} alt="" loading="lazy" decoding="async" />
    </div>
  )
}
