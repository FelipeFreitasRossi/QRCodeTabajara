import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { AlertTriangle, Clock3, Gift, Loader2, ReceiptText, RefreshCw, Users } from 'lucide-react'

import { errorMessage } from '../../services/api'
import * as api from '../../services/adminService'
import type { BillItem, TableBill } from '../../types/bill'
import { ORDER_STATUS_LABEL } from '../../types/order'
import { cx } from '../../utils/dom'
import { Button } from '../ui/Button'
import { Money } from '../ui/Money'
import { Sheet } from '../ui/Sheet'
import { CloseBillDialog } from './CloseBillDialog'
import styles from './BillSheet.module.css'

interface BillSheetProps {
  tableNumber: number
  open: boolean
  onClose: () => void
  onExited: () => void
  /** Depois de fechar a conta (para atualizar a lista de chamados). */
  onClosed?: () => void
}

type View = 'pedidos' | 'itens'

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** "1h12" / "35 min" desde o primeiro pedido. */
function sinceLabel(iso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}

/** Junta os itens iguais de todos os pedidos (ex.: 2 + 1 caipirinhas = 3×). */
function sumItems(bill: TableBill): BillItem[] {
  const map = new Map<string, BillItem>()
  for (const order of bill.orders) {
    for (const item of order.items) {
      const key = `${item.kind}:${item.name}`
      const current = map.get(key)
      if (current) {
        current.quantity += item.quantity
        current.subtotal_cents += item.subtotal_cents
      } else {
        map.set(key, { ...item })
      }
    }
  }
  return [...map.values()].sort((a, b) => b.subtotal_cents - a.subtotal_cents || a.name.localeCompare(b.name, 'pt-BR'))
}

function ItemLine({ item }: { item: BillItem }) {
  return (
    <li>
      <span className={styles.qty}>{item.quantity}×</span>
      <span className={styles.itemName}>
        {item.name}
        {item.kind !== 'produto' && (
          <em className={styles.free}>
            <Gift size={12} aria-hidden="true" />
            {item.kind === 'aniversario' ? 'aniversário' : 'pontos'}
          </em>
        )}
      </span>
      <span className={styles.price}>
        {item.subtotal_cents === 0 ? 'grátis' : <Money cents={item.subtotal_cents} variant="plain" />}
      </span>
    </li>
  )
}

/** Conta da mesa: os pedidos ainda não fechados, com itens e total, e o botão "Fechar conta". */
export function BillSheet({ tableNumber, open, onClose, onExited, onClosed }: BillSheetProps) {
  const titleId = useId()
  const [bill, setBill] = useState<TableBill | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<View>('pedidos')
  const [now] = useState(() => Date.now())
  const [confirmMounted, setConfirmMounted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = useCallback(() => {
    setError(null)
    setLoading(true)
    api
      .getTableBill(tableNumber)
      .then(setBill)
      .catch((err) => setError(errorMessage(err, 'Não foi possível carregar a conta.')))
      .finally(() => setLoading(false))
  }, [tableNumber])

  useEffect(load, [load])

  const summed = useMemo(() => (bill ? sumItems(bill) : []), [bill])
  const hasOrders = Boolean(bill && bill.orders.length > 0)

  const footer = hasOrders && bill && (
    <div className={styles.footer}>
      <div className={styles.total}>
        <span>Total da mesa</span>
        <strong>
          <Money cents={bill.total_cents} />
        </strong>
      </div>
      <Button
        variant="primary"
        block
        onClick={() => {
          setConfirmMounted(true)
          setConfirmOpen(true)
        }}
        icon={<ReceiptText size={18} />}
      >
        Fechar conta
      </Button>
    </div>
  )

  return (
    <Sheet open={open} onClose={onClose} onExited={onExited} labelledBy={titleId} closeLabel="Fechar a conta da mesa" footer={footer || undefined}>
      <div className={styles.body}>
        {/* Cabeçalho de comanda */}
        <header className={styles.ticket}>
          <p className={styles.eyebrow}>Conta da mesa</p>
          <div className={styles.titleRow}>
            <h2 id={titleId} className={styles.title}>
              Mesa {pad(tableNumber)}
            </h2>
            <button
              type="button"
              className={styles.refresh}
              onClick={load}
              disabled={loading}
              aria-label="Atualizar a conta"
              title="Atualizar"
            >
              <RefreshCw size={16} className={loading ? styles.spin : undefined} />
            </button>
          </div>
          {hasOrders && bill && (
            <ul className={styles.facts}>
              {bill.since && (
                <li>
                  <Clock3 size={14} aria-hidden="true" /> desde {clock(bill.since)} · {sinceLabel(bill.since, now)} de mesa
                </li>
              )}
              <li>
                <ReceiptText size={14} aria-hidden="true" /> {bill.orders.length} {bill.orders.length === 1 ? 'pedido' : 'pedidos'}
              </li>
              {bill.names.length > 0 && (
                <li title={bill.names.join(', ')}>
                  <Users size={14} aria-hidden="true" /> {bill.names.join(', ')}
                </li>
              )}
            </ul>
          )}
        </header>

        {error && (
          <p className={styles.error}>
            {error}{' '}
            <button type="button" className={styles.retry} onClick={load}>
              <RefreshCw size={14} /> Tentar de novo
            </button>
          </p>
        )}

        {!bill && !error && (
          <p className={styles.muted}>
            <Loader2 size={16} className={styles.spin} /> Carregando pedidos…
          </p>
        )}

        {bill && bill.orders.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden="true">
              <ReceiptText size={26} strokeWidth={1.4} />
            </span>
            <strong>Nenhum pedido em aberto</strong>
            <span>Esta mesa não tem pedidos pelo site para cobrar. Se o cliente pediu direto com a equipe, confira no caixa.</span>
          </div>
        )}

        {hasOrders && bill && (
          <>
            {bill.unfinished > 0 && (
              <p className={styles.warning}>
                <AlertTriangle size={16} aria-hidden="true" />
                {bill.unfinished === 1 ? '1 pedido ainda não foi entregue.' : `${bill.unfinished} pedidos ainda não foram entregues.`}
              </p>
            )}

            <div className={styles.segmented} role="tablist" aria-label="Como mostrar a conta">
              <button type="button" role="tab" aria-selected={view === 'pedidos'} className={cx(styles.segment, view === 'pedidos' && styles.segmentOn)} onClick={() => setView('pedidos')}>
                Por pedido
              </button>
              <button type="button" role="tab" aria-selected={view === 'itens'} className={cx(styles.segment, view === 'itens' && styles.segmentOn)} onClick={() => setView('itens')}>
                Itens somados
              </button>
            </div>

            {view === 'pedidos' ? (
              <ol className={styles.orders}>
                {bill.orders.map((order, i) => (
                  <li key={order.id} className={styles.order} style={{ animationDelay: `${i * 60}ms` }}>
                    <div className={styles.orderHead}>
                      <span className={styles.code}>#{order.short_code}</span>
                      <span className={styles.name}>{order.customer_name}</span>
                      <span className={styles.time}>{clock(order.created_at)}</span>
                      <span className={cx(styles.status, order.status !== 'entregue' && styles.statusOpen)}>
                        {ORDER_STATUS_LABEL[order.status]}
                      </span>
                    </div>
                    <ul className={styles.items}>
                      {order.items.map((item, j) => (
                        <ItemLine key={j} item={item} />
                      ))}
                    </ul>
                    <div className={styles.orderTotal}>
                      <span>Subtotal</span>
                      <Money cents={order.total_cents} variant="plain" />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className={styles.order}>
                <ul className={cx(styles.items, styles.itemsSummed)}>
                  {summed.map((item) => (
                    <ItemLine key={`${item.kind}:${item.name}`} item={item} />
                  ))}
                </ul>
                <div className={styles.orderTotal}>
                  <span>
                    {summed.reduce((n, item) => n + item.quantity, 0)} itens
                  </span>
                  <Money cents={bill.total_cents} variant="plain" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {confirmMounted && bill && (
        <CloseBillDialog
          tableNumber={tableNumber}
          bill={bill}
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onExited={() => setConfirmMounted(false)}
          onDone={() => {
            onClosed?.()
            onClose()
          }}
        />
      )}
    </Sheet>
  )
}
