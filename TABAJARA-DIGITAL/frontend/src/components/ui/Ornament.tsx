import { cx } from '../../utils/dom'
import styles from './Ornament.module.css'

interface OrnamentProps {
  className?: string
  /** "center": linha — losango — linha. "left": losango seguido de linha. */
  align?: 'center' | 'left'
}

/** Pequeno detalhe decorativo dourado, usado para separar blocos. */
export function Ornament({ className, align = 'center' }: OrnamentProps) {
  return (
    <span className={cx(styles.ornament, styles[align], className)} aria-hidden="true">
      {align === 'center' && <span className={styles.line} />}
      <span className={styles.diamond} />
      <span className={styles.line} />
    </span>
  )
}
