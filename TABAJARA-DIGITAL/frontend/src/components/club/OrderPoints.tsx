import { ArrowRight, Crown, Hourglass } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { Order } from '../../types/order'
import { cx } from '../../utils/dom'
import { formatPoints } from '../../utils/format'
import { SlotCounter } from '../motion/SlotCounter'
import styles from './OrderPoints.module.css'

/** Pontos do Clube na tela de acompanhamento: "a caminho" e depois "creditados" com o contador girando. */
export function OrderPoints({ order }: { order: Order }) {
  if (order.loyalty_points <= 0) return null
  const cancelled = order.status === 'cancelado'
  const credited = order.loyalty_credited && !cancelled

  return (
    <section className={cx(styles.card, credited && styles.credited, cancelled && styles.cancelled)} aria-live="polite">
      <span className={styles.icon} aria-hidden="true">
        {credited ? <Crown size={20} strokeWidth={1.75} /> : <Hourglass size={18} strokeWidth={1.75} />}
      </span>
      <div className={styles.body}>
        <p className={styles.eyebrow}>Clube Tabajara</p>
        {cancelled ? (
          <p className={styles.text}>
            Os {formatPoints(order.loyalty_points)} pontos deste pedido não serão creditados.
          </p>
        ) : credited ? (
          <p className={styles.big}>
            <span className={styles.amount}>
              +<SlotCounter value={order.loyalty_points} />
            </span>{' '}
            <span className={styles.unit}>pontos creditados</span>
          </p>
        ) : (
          <>
            <p className={styles.big}>
              +{formatPoints(order.loyalty_points)} <span className={styles.unit}>pontos a caminho</span>
            </p>
            <p className={styles.text}>Entram no seu saldo assim que o pedido for entregue.</p>
            <span className={styles.track} aria-hidden="true">
              <span />
            </span>
          </>
        )}
      </div>
      {!cancelled && (
        <Link to="/clube" className={styles.link} aria-label="Ver meus pontos no Clube">
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      )}
    </section>
  )
}
