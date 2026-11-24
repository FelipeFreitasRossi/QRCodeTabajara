import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'

import type { AdminOrder, OrderStatus } from '../../types/order'
import { cx } from '../../utils/dom'
import { formatTime, timeAgo } from '../../utils/format'
import { Button } from '../ui/Button'
import { StatusBadge } from './StatusBadge'
import styles from './OrderCard.module.css'
import { Money } from '../ui/Money'

const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  recebido: { status: 'em_preparo', label: 'Iniciar preparo' },
  em_preparo: { status: 'pronto', label: 'Marcar como pronto' },
  pronto: { status: 'entregue', label: 'Marcar como entregue' },
}

interface OrderCardProps {
  order: AdminOrder
  onChangeStatus: (order: AdminOrder, status: OrderStatus) => Promise<void>
  compact?: boolean
}

export function OrderCard({ order, onChangeStatus, compact = false }: OrderCardProps) {
  const [busy, setBusy] = useState(false)
  const [, forceTick] = useState(0)
  const next = NEXT[order.status]
  const isNew = order.status === 'recebido'

  // Atualiza o "há X min" a cada minuto.
  useEffect(() => {
    const timer = window.setInterval(() => forceTick((n) => n + 1), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const change = async (status: OrderStatus) => {
    if (
      status === 'cancelado' &&
      !window.confirm(`Cancelar o pedido #${order.short_code} da mesa ${order.table_number}?`)
    )
      return
    setBusy(true)
    try {
      await onChangeStatus(order, status)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className={cx(styles.card, isNew && styles.new, compact && styles.compact)}
      aria-label={`Pedido ${order.short_code}, mesa ${order.table_number}`}
    >
      <header className={styles.head}>
        <div className={styles.table}>
          <span className={styles.tableLabel}>Mesa</span>
          <span className={styles.tableNumber}>{String(order.table_number).padStart(2, '0')}</span>
        </div>
        <div className={styles.meta}>
          <StatusBadge status={order.status} />
          <span className={styles.time}>
            #{order.short_code} · {formatTime(order.created_at)} · {timeAgo(order.created_at)}
          </span>
          <span className={styles.customer}>{order.customer_name}</span>
        </div>
      </header>

      {!compact && (
        <ul className={styles.items}>
          {order.items.map((item, index) => (
            <li key={`${item.kind}-${item.product_id ?? index}`}>
              <span className={styles.qty}>{item.quantity}×</span>
              <span>
                {item.name}
                {item.kind === 'resgate' && <em className={styles.rewardTag}> · resgate Clube</em>}
                {item.kind === 'aniversario' && <em className={styles.rewardTag}> · presente</em>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!compact && order.notes && (
        <p className={styles.notes}>
          <MessageSquare size={14} aria-hidden="true" />
          {order.notes}
        </p>
      )}

      <footer className={styles.foot}>
        <span className={styles.total}>
          <Money cents={order.total_cents} variant="plain" />
        </span>
        <div className={styles.actions}>
          {next && order.status !== 'entregue' && (
            <button type="button" className={styles.cancel} onClick={() => change('cancelado')} disabled={busy}>
              Cancelar
            </button>
          )}
          {next && (
            <Button variant={isNew ? 'primary' : 'outline'} onClick={() => change(next.status)} disabled={busy}>
              {busy ? 'Salvando…' : next.label}
            </Button>
          )}
        </div>
      </footer>
    </article>
  )
}
