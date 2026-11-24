import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { OrderCard } from '../../components/admin/OrderCard'
import { Button } from '../../components/ui/Button'
import { useAdmin } from '../../hooks/useAdmin'
import { errorMessage } from '../../services/api'
import type { AdminOrder, OrderStatus } from '../../types/order'
import { cx } from '../../utils/dom'
import { formatPrice } from '../../utils/format'
import styles from './OrdersPage.module.css'

const COLUMNS: { status: OrderStatus; title: string; empty: string }[] = [
  { status: 'recebido', title: 'Novos', empty: 'Nenhum pedido novo.' },
  { status: 'em_preparo', title: 'Em preparo', empty: 'Nada sendo preparado.' },
  { status: 'pronto', title: 'Prontos', empty: 'Nenhum pedido aguardando entrega.' },
]

/** Pedidos em tempo real, organizados por etapa (atualiza a cada poucos segundos). */
export function OrdersPage() {
  const { orders, ordersError, refreshOrders, setOrderStatus, notify } = useAdmin()
  const [mobileColumn, setMobileColumn] = useState<OrderStatus>('recebido')

  const byStatus = (status: OrderStatus) =>
    (orders ?? []).filter((order) => order.status === status).sort((a, b) => a.created_at.localeCompare(b.created_at)) // mais antigo primeiro: fila de produção

  const finished = (orders ?? []).filter((o) => o.status === 'entregue' || o.status === 'cancelado')
  const revenue = finished.filter((o) => o.status === 'entregue').reduce((sum, o) => sum + o.total_cents, 0)

  const handleChange = async (order: AdminOrder, status: OrderStatus) => {
    try {
      await setOrderStatus(order.id, status)
    } catch (error) {
      notify(errorMessage(error, 'Não foi possível atualizar o pedido.'))
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Pedidos"
        subtitle={
          <span className={styles.live}>
            <span className={styles.dot} aria-hidden="true" />
            Atualizando automaticamente
          </span>
        }
        actions={
          <Button onClick={() => void refreshOrders()} icon={<RefreshCw size={16} aria-hidden="true" />}>
            Atualizar
          </Button>
        }
      />

      {ordersError && (
        <p className={styles.error} role="alert">
          {ordersError}
        </p>
      )}

      {/* Celular: abas por etapa */}
      <div className={styles.segmented} role="tablist" aria-label="Etapas">
        {COLUMNS.map((column) => (
          <button
            key={column.status}
            type="button"
            role="tab"
            aria-selected={mobileColumn === column.status}
            className={cx(styles.segment, mobileColumn === column.status && styles.segmentActive)}
            onClick={() => setMobileColumn(column.status)}
          >
            {column.title}
            <span className={styles.count}>{byStatus(column.status).length}</span>
          </button>
        ))}
      </div>

      {orders === null ? (
        <p className={styles.muted}>Carregando pedidos…</p>
      ) : (
        <div className={styles.board}>
          {COLUMNS.map((column) => {
            const list = byStatus(column.status)
            return (
              <section
                key={column.status}
                className={cx(styles.column, mobileColumn === column.status && styles.columnVisible)}
                aria-labelledby={`col-${column.status}`}
              >
                <h2 id={`col-${column.status}`} className={styles.columnTitle}>
                  {column.title}
                  <span className={styles.count}>{list.length}</span>
                </h2>
                {list.length === 0 ? (
                  <p className={styles.empty}>{column.empty}</p>
                ) : (
                  <div className={styles.list}>
                    {list.map((order) => (
                      <OrderCard key={order.id} order={order} onChangeStatus={handleChange} />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {finished.length > 0 && (
        <details className={styles.finished}>
          <summary>
            Finalizados hoje ({finished.length}) · {formatPrice(revenue)} entregues
          </summary>
          <div className={styles.finishedList}>
            {finished.map((order) => (
              <OrderCard key={order.id} order={order} onChangeStatus={handleChange} compact />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
