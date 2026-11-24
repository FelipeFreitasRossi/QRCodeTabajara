import { useEffect, useState } from 'react'
import { ArrowRight, CirclePlus, ClipboardList, TrendingUp, UtensilsCrossed } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { useAdmin } from '../../hooks/useAdmin'
import { useAuth } from '../../hooks/useAuth'
import { errorMessage } from '../../services/api'
import { getDashboard } from '../../services/adminService'
import type { Dashboard } from '../../types/admin'
import { formatTime } from '../../utils/format'
import styles from './DashboardPage.module.css'
import { Money } from '../../components/ui/Money'

export function DashboardPage() {
  const { admin } = useAuth()
  const { orders } = useAdmin()
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Recarrega os números sempre que a lista de pedidos muda.
  const ordersKey = orders?.map((o) => `${o.id}:${o.status}`).join('|') ?? ''
  useEffect(() => {
    const controller = new AbortController()
    getDashboard(controller.signal)
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err))
      })
    return () => controller.abort()
  }, [ordersKey])

  const firstName = admin?.name.split(' ')[0] ?? ''

  return (
    <div>
      <AdminPageHeader
        title={`Olá, ${firstName}`}
        subtitle="Resumo do dia no Tabajara."
        actions={
          <Link to="/admin/produtos/novo" className={styles.primaryLink}>
            <CirclePlus size={18} aria-hidden="true" />
            Novo produto
          </Link>
        }
      />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.stats}>
        <Link to="/admin/pedidos" className={`${styles.stat} ${styles.highlight}`}>
          <span className={styles.statLabel}>Aguardando preparo</span>
          <span className={styles.statValue}>{data?.pending_orders ?? '–'}</span>
          <span className={styles.statFoot}>
            {data ? `${data.active_orders} em andamento` : ' '} <ArrowRight size={14} aria-hidden="true" />
          </span>
        </Link>
        <div className={styles.stat}>
          <span className={styles.statLabel}>
            <ClipboardList size={14} aria-hidden="true" /> Pedidos hoje
          </span>
          <span className={styles.statValue}>{data?.orders_today ?? '–'}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>
            <TrendingUp size={14} aria-hidden="true" /> Vendas hoje
          </span>
          <span className={styles.statValue}>{data ? <Money cents={data.revenue_today_cents} /> : '–'}</span>
          <span className={styles.statFoot}>sem pedidos cancelados</span>
        </div>
        <Link to="/admin/produtos" className={styles.stat}>
          <span className={styles.statLabel}>
            <UtensilsCrossed size={14} aria-hidden="true" /> Cardápio
          </span>
          <span className={styles.statValue}>{data?.products ?? '–'}</span>
          <span className={styles.statFoot}>
            {data ? `${data.categories} categorias · ${data.unavailable_products} indisponíveis` : ' '}
          </span>
        </Link>
      </div>

      <section className={styles.panel} aria-labelledby="recentes">
        <div className={styles.panelHead}>
          <h2 id="recentes" className={styles.panelTitle}>
            Últimos pedidos
          </h2>
          <Link to="/admin/pedidos" className={styles.more}>
            Ver todos <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        {data && data.recent_orders.length === 0 && <p className={styles.muted}>Nenhum pedido ainda.</p>}
        <ul className={styles.recent}>
          {data?.recent_orders.map((order) => (
            <li key={order.id} className={styles.recentRow}>
              <span className={styles.recentTable}>Mesa {String(order.table_number).padStart(2, '0')}</span>
              <span className={styles.recentInfo}>
                <span>{order.customer_name}</span>
                <span className={styles.muted}>
                  #{order.short_code} · {formatTime(order.created_at)} ·{' '}
                  {order.items.reduce((n, i) => n + i.quantity, 0)} itens
                </span>
              </span>
              <StatusBadge status={order.status} />
              <span className={styles.recentTotal}>
                <Money cents={order.total_cents} variant="plain" />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
