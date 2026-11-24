import { useState } from 'react'

import { resolveAssetUrl } from '../../services/api'
import { cx } from '../../utils/dom'
import styles from './ProductImage.module.css'

interface ProductImageProps {
  src: string | null
  alt: string
  className?: string
  /** Use true para imagens visíveis logo ao abrir (carregam sem atraso). */
  eager?: boolean
  muted?: boolean
}

/** Foto do produto com carregamento suave e um fallback elegante quando não há foto. */
export function ProductImage({ src, alt, className, eager = false, muted = false }: ProductImageProps) {
  const url = resolveAssetUrl(src)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  if (!url || status === 'error') {
    return (
      <div className={cx(styles.frame, styles.placeholder, className)} aria-hidden="true">
        <span className={styles.monogram}>T</span>
      </div>
    )
  }

  return (
    <div className={cx(styles.frame, className)}>
      <img
        src={url}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={cx(styles.image, status === 'loaded' && styles.loaded, muted && styles.muted)}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  )
}
