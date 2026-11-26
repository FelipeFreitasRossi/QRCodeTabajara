import { cx } from '../utils/dom'
import styles from './Logo.module.css'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showTagline?: boolean
  className?: string
}

/**
 * Logotipo em texto. Quando o Tabajara enviar o logo oficial, salve-o em
 * frontend-chamar/public/logo.svg e troque o <span> por:
 *   <img src="/logo.svg" alt="Tabajara" className={styles.image} />
 */
export function Logo({ size = 'md', showTagline = false, className }: LogoProps) {
  return (
    <span className={cx(styles.logo, styles[size], className)}>
      <span className={styles.wordmark}>Tabajara</span>
      {showTagline && <span className={styles.tagline}>São Carlos · SP</span>}
    </span>
  )
}
