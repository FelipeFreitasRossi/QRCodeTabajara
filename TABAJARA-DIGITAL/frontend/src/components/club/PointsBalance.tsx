import { useEffect, useRef, useState } from 'react'
import { Hourglass, TrendingUp } from 'lucide-react'

import { useCountUp } from '../../hooks/useCountUp'
import { useInView } from '../../hooks/useInView'
import type { ClubSummary } from '../../types/club'
import { cx, prefersReducedMotion } from '../../utils/dom'
import { formatPoints } from '../../utils/format'
import { SlotCounter } from '../motion/SlotCounter'
import styles from './PointsBalance.module.css'

interface PointsBalanceProps {
  summary: ClubSummary
  /** Avisa quando o bloco do saldo sai/entra na tela (para a barra fixa). */
  onVisibilityChange?: (visible: boolean) => void
}

const SPARKS = 16

/** Saldo de pontos acumulados: contador caça-níquel, brilhos ao parar e números que sobem. */
export function PointsBalance({ summary, onVisibilityChange }: PointsBalanceProps) {
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.35 })
  const [burst, setBurst] = useState(0)
  const lifetime = useCountUp(summary.lifetime_earned, inView, 1600)
  const pending = useCountUp(summary.pending_points, inView, 1300)
  const sectionRef = useRef<HTMLElement | null>(null)

  // barra fixa: observa continuamente (o useInView dispara só uma vez)
  useEffect(() => {
    const el = sectionRef.current
    if (!el || !onVisibilityChange) return
    const observer = new IntersectionObserver(([entry]) => onVisibilityChange(entry.isIntersecting), {
      rootMargin: '-80px 0px 0px 0px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [onVisibilityChange])

  const setRefs = (el: HTMLElement | null) => {
    ref.current = el
    sectionRef.current = el
  }

  return (
    <section ref={setRefs} className={cx(styles.section, inView && styles.visible)} aria-labelledby="saldo-titulo">
      <p id="saldo-titulo" className={styles.label}>
        Pontos acumulados
      </p>

      <div className={styles.counterWrap}>
        <SlotCounter
          value={summary.balance}
          active={inView}
          gold
          className={styles.counter}
          onSettled={() => !prefersReducedMotion() && setBurst((n) => n + 1)}
        />
        {burst > 0 && (
          <span key={burst} className={styles.sparks} aria-hidden="true">
            {Array.from({ length: SPARKS }, (_, i) => (
              <span
                key={i}
                style={{
                  ['--x' as string]: `${(i / (SPARKS - 1)) * 100}%`,
                  ['--d' as string]: `${(i % 5) * 70}ms`,
                  ['--h' as string]: `${50 + ((i * 37) % 60)}px`,
                }}
              />
            ))}
          </span>
        )}
      </div>
      <p className={styles.unit}>pontos disponíveis</p>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statIcon} aria-hidden="true">
            <TrendingUp size={16} />
          </span>
          <span className={styles.statValue}>{formatPoints(lifetime)}</span>
          <span className={styles.statLabel}>já ganhos no total</span>
        </div>
        <div className={cx(styles.stat, summary.pending_points > 0 && styles.statPending)}>
          <span className={styles.statIcon} aria-hidden="true">
            <Hourglass size={16} />
          </span>
          <span className={styles.statValue}>+{formatPoints(pending)}</span>
          <span className={styles.statLabel}>
            {summary.pending_orders > 0
              ? `a caminho · ${summary.pending_orders} ${summary.pending_orders === 1 ? 'pedido' : 'pedidos'}`
              : 'a caminho'}
          </span>
        </div>
      </div>
    </section>
  )
}
