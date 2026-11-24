import { useCallback, useEffect, useState } from 'react'
import { Check, ChefHat, CircleX, Bell, Utensils, RefreshCw } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { OrderPoints } from '../components/club/OrderPoints'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Ornament } from '../components/ui/Ornament'
import { ApiError, errorMessage } from '../services/api'
import { getOrder } from '../services/orderService'
import { ORDER_FLOW, ORDER_STATUS_LABEL } from '../types/order'
import type { Order, OrderStatus } from '../types/order'
import { cx } from '../utils/dom'
import { formatTime } from '../utils/format'
import styles from './OrderStatusPage.module.css'
import { Money, Points } from '../components/ui/Money'

const POLL_MS = 8000

const STEP_INFO: Record<Exclude<OrderStatus, 'cancelado'>, { icon: typeof Check; text: string }> = {
  recebido: { icon: Check, text: 'O restaurante recebeu seu pedido.' },
  em_preparo: { icon: ChefHat, text: 'A cozinha está preparando seu pedido.' },
  pronto: { icon: Bell, text: 'Seu pedido está pronto e já vai para a mesa.' },
  entregue: { icon: Utensils, text: 'Pedido entregue. Bom apetite!' },
}

/** Acompanhamento do pedido pelo cliente. Atualiza sozinho a cada poucos segundos. */
export function OrderStatusPage() {
  const { code = '' } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const data = await getOrder(code, signal)
        setOrder(data)
        setError(null)
      } catch (err) {
        if (signal?.aborted) return
        if (err instanceof ApiError && err.status === 404) setNotFound(true)
        else setError(errorMessage(err, 'Não foi possível atualizar o pedido.'))
      }
    },
    [code],
  )

  const finished = order?.status === 'entregue' || order?.status === 'cancelado'

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  useEffect(() => {
    if (finished || notFound) return
    const timer = window.setInterval(() => void load(), POLL_MS)
    return () => window.clearInterval(timer)
  }, [finished, notFound, load])

  useEffect(() => {
    document.title = order
      ? `Pedido #${order.short_code} · ${ORDER_STATUS_LABEL[order.status]}`
      : 'Seu pedido · Tabajara'
  }, [order])

  if (notFound) {
    return (
      <>
        <PageHeader />
        <main className={styles.center}>
          <h1 className={styles.centerTitle}>Pedido não encontrado</h1>
          <p className={styles.muted}>Confira o link ou fale com um atendente.</p>
          <Link to="/cardapio" className={styles.link}>
            Voltar ao cardápio
          </Link>
        </main>
      </>
    )
  }

  if (!order) {
    return (
      <>
        <PageHeader />
        <main className={styles.center} aria-busy="true">
          {error ? (
            <>
              <p className={styles.muted}>{error}</p>
              <Button onClick={() => void load()} icon={<RefreshCw size={16} aria-hidden="true" />}>
                Tentar novamente
              </Button>
            </>
          ) : (
            <p className={styles.muted}>Carregando seu pedido…</p>
          )}
        </main>
      </>
    )
  }

  const currentIndex = ORDER_FLOW.indexOf(order.status)
  const cancelled = order.status === 'cancelado'

  return (
    <>
      <PageHeader />
      <main className={styles.page}>
        <section className={styles.hero} aria-live="polite">
          <Ornament />
          <p className={styles.eyebrow}>Pedido #{order.short_code}</p>
          <h1 className={styles.title}>
            {cancelled ? 'Pedido cancelado' : order.status === 'entregue' ? 'Bom apetite!' : 'Pedido enviado!'}
          </h1>
          <p className={styles.lead}>
            {cancelled
              ? 'Este pedido foi cancelado pelo restaurante. Em caso de dúvida, chame um atendente.'
              : `Obrigado, ${order.customer_name}. Mesa ${String(order.table_number).padStart(2, '0')} · feito às ${formatTime(order.created_at)}`}
          </p>
        </section>

        {cancelled ? (
          <div className={styles.cancelled}>
            <CircleX size={22} strokeWidth={1.5} aria-hidden="true" />
            Cancelado às {formatTime(order.status_updated_at)}
          </div>
        ) : (
          <ol className={styles.timeline} aria-label="Andamento do pedido">
            {ORDER_FLOW.map((step, index) => {
              const info = STEP_INFO[step as Exclude<OrderStatus, 'cancelado'>]
              const Icon = info.icon
              const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo'
              return (
                <li
                  key={step}
                  className={cx(styles.step, styles[state])}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  <span className={styles.dot} aria-hidden="true">
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <div>
                    <p className={styles.stepTitle}>{ORDER_STATUS_LABEL[step]}</p>
                    {state === 'current' && <p className={styles.stepText}>{info.text}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        <OrderPoints order={order} />

        <section className={styles.receipt} aria-labelledby="resumo-titulo">
          <h2 id="resumo-titulo" className={styles.receiptTitle}>
            Resumo
          </h2>
          <ul className={styles.items}>
            {order.items.map((item, index) => (
              <li key={`${item.kind}-${item.product_id ?? index}`} className={styles.itemRow}>
                <span className={styles.qty}>{item.quantity}×</span>
                <span className={styles.itemName}>
                  {item.name}
                  {item.kind === 'resgate' && <span className={styles.itemTag}>Resgate com pontos</span>}
                  {item.kind === 'aniversario' && <span className={styles.itemTag}>Presente de aniversário</span>}
                </span>
                <span className={styles.itemPrice}>
                  {item.kind === 'resgate' ? (
                    <Points value={-item.points_cost * item.quantity} signed />
                  ) : item.kind === 'aniversario' ? (
                    'Grátis'
                  ) : (
                    <Money cents={item.subtotal_cents} variant="plain" />
                  )}
                </span>
              </li>
            ))}
          </ul>
          {order.notes && (
            <p className={styles.notes}>
              <strong>Observações:</strong> {order.notes}
            </p>
          )}
          <div className={styles.totalRow}>
            <span>Total</span>
            <span className={styles.total}>
              <Money cents={order.total_cents} />
            </span>
          </div>
        </section>

        {!finished && (
          <p className={styles.auto}>
            <span className={styles.pulse} aria-hidden="true" />
            Esta página se atualiza sozinha.
          </p>
        )}
        {error && <p className={styles.muted}>{error}</p>}

        <div className={styles.actions}>
          <Link to="/cardapio" className={styles.link}>
            Voltar ao cardápio
          </Link>
        </div>
      </main>
    </>
  )
}
