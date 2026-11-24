import { Logo } from '../ui/Logo'
import styles from './MenuSkeleton.module.css'

/** Esqueleto exibido enquanto o cardápio carrega (evita tela em branco). */
export function MenuSkeleton() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Carregando o cardápio…</span>
      <div className={styles.hero}>
        <Logo size="lg" className={styles.logo} />
        <span className={styles.rule} />
      </div>
      <div className={styles.container} aria-hidden="true">
        <div className={`${styles.block} ${styles.search}`} />
        <div className={styles.chips}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`${styles.block} ${styles.chip}`} />
          ))}
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={styles.row}>
            <div className={styles.lines}>
              <div className={`${styles.block} ${styles.lineTitle}`} />
              <div className={`${styles.block} ${styles.line}`} />
              <div className={`${styles.block} ${styles.lineShort}`} />
            </div>
            <div className={`${styles.block} ${styles.thumb}`} />
          </div>
        ))}
      </div>
    </div>
  )
}
