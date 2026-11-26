import { useEffect, useId, useState } from 'react'
import { AlertTriangle, Check, Gift, Loader2, ReceiptText, RefreshCw } from 'lucide-react'

import { useAdmin } from '../../hooks/useAdmin'
import { errorMessage } from '../../services/api'
import * as api from '../../services/adminService'
import type { PaymentMethod } from '../../services/adminService'
import type { TableBill } from '../../types/bill'
import { ORDER_STATUS_LABEL } from '../../types/order'
import { cx } from '../../utils/dom'
import { Button } from '../ui/Button'
import { Money } from '../ui/Money'
import { Sheet } from '../ui/Sheet'
import { ChoiceChips, ConfirmDialog } from './ConfirmDialog'
import styles from './BillSheet.module.css'

interface BillSheetProps {
  tableNumber: number
  open: boolean
  onClose: () => void
  onExited: () => void
  /** Depois de fechar a conta (para atualizar a lista de chamados). */
  onClosed?: () => void
}

const pad = (n: number) => String(n).padStart(2, '0')

const PAYMENTS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'credito', label: 'Crédito' },
  { value: 'debito', label: 'Débito' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'outro', label: 'Outro' },
]
const PAYMENT_LABEL = Object.fromEntries(PAYMENTS.map((p) => [p.value, p.label])) as Record<PaymentMethod, string>
/** Tempo mostrando "Conta fechada ✓" antes de fechar sozinho. */
const SUCCESS_MS = 1600
const clock = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Conta da mesa: todos os pedidos ainda não fechados, com itens e total, e o botão "Fechar conta". */
export function BillSheet({ tableNumber, open, onClose, onExited, onClosed }: BillSheetProps) {
  const titleId = useId()
  const { notify } = useAdmin()
  const [bill, setBill] = useState<TableBill | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [confirmMounted, setConfirmMounted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [payment, setPayment] = useState<PaymentMethod | null>(null)
  const [closedTotal, setClosedTotal] = useState<number | null>(null)

  const load = () => {
    setError(null)
    api
      .getTableBill(tableNumber)
      .then(setBill)
      .catch((err) => setError(errorMessage(err, 'Não foi possível carregar a conta.')))
  }

  useEffect(load, [tableNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  const askClose = () => {
    if (!bill || bill.orders.length === 0) return
    setPayment(null)
    setClosedTotal(null)
    setConfirmMounted(true)
    setConfirmOpen(true)
  }

  const closeBill = async () => {
    if (!bill || bill.orders.length === 0) return
    setClosing(true)
    try {
      const result = await api.closeTableBill(
        tableNumber,
        bill.orders.map((o) => o.id),
        payment,
      )
      if (result.closed_orders < bill.orders.length) notify('Alguns pedidos já tinham sido fechados por outra pessoa.')
      setClosedTotal(result.total_cents)
      onClosed?.()
      // mostra "Conta fechada ✓" e fecha os dois painéis
      window.setTimeout(() => {
        setConfirmOpen(false)
        onClose()
      }, SUCCESS_MS)
    } catch (err) {
      notify(errorMessage(err, 'Não foi possível fechar a conta.'))
    } finally {
      setClosing(false)
    }
  }

  const footer = bill && bill.orders.length > 0 && (
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
        onClick={askClose}
        icon={<ReceiptText size={18} />}
      >
        Fechar conta
      </Button>
    </div>
  )

  return (
    <Sheet open={open} onClose={onClose} onExited={onExited} labelledBy={titleId} closeLabel="Fechar a conta da mesa" footer={footer || undefined}>
      <div className={styles.body}>
        <p className={styles.eyebrow}>Conta da mesa</p>
        <h2 id={titleId} className={styles.title}>
          Mesa {pad(tableNumber)}
        </h2>

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
          <p className={styles.empty}>
            Nenhum pedido em aberto nesta mesa. Se o cliente pediu algo direto com a equipe, confira no caixa.
          </p>
        )}

        {bill && bill.orders.length > 0 && (
          <>
            <p className={styles.meta}>
              {bill.orders.length} {bill.orders.length === 1 ? 'pedido' : 'pedidos'}
              {bill.since && <> · desde {clock(bill.since)}</>}
              {bill.names.length > 0 && <> · {bill.names.join(', ')}</>}
            </p>

            {bill.unfinished > 0 && (
              <p className={styles.warning}>
                <AlertTriangle size={16} aria-hidden="true" />
                {bill.unfinished === 1
                  ? '1 pedido ainda não foi entregue.'
                  : `${bill.unfinished} pedidos ainda não foram entregues.`}
              </p>
            )}

            <ol className={styles.orders}>
              {bill.orders.map((order) => (
                <li key={order.id} className={styles.order}>
                  <div className={styles.orderHead}>
                    <span className={styles.code}>#{order.short_code}</span>
                    <span className={styles.name}>{order.customer_name}</span>
                    <span className={styles.time}>{clock(order.created_at)}</span>
                    <span className={cx(styles.status, order.status !== 'entregue' && styles.statusOpen)}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  <ul className={styles.items}>
                    {order.items.map((item, i) => (
                      <li key={i}>
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
                    ))}
                  </ul>
                  <div className={styles.orderTotal}>
                    <span>Subtotal</span>
                    <Money cents={order.total_cents} variant="plain" />
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      {confirmMounted && bill && (
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onExited={() => setConfirmMounted(false)}
          tone="gold"
          icon={<ReceiptText size={24} strokeWidth={1.7} />}
          eyebrow={`Mesa ${pad(tableNumber)}`}
          title="Fechar a conta?"
          description={
            <>
              {bill.orders.length} {bill.orders.length === 1 ? 'pedido' : 'pedidos'}
              {bill.names.length > 0 && <> de {bill.names.join(', ')}</>}. Os próximos clientes desta mesa começam com a
              conta zerada.
            </>
          }
          confirmLabel="Fechar conta"
          confirmIcon={<Check size={18} strokeWidth={2.6} />}
          busy={closing}
          onConfirm={() => void closeBill()}
          success={
            closedTotal !== null ? (
              <>
                <span className={styles.successIcon} aria-hidden="true">
                  <Check size={36} strokeWidth={2.6} />
                </span>
                <strong className={styles.successTitle}>Conta fechada</strong>
                <span className={styles.successText}>
                  Mesa {pad(tableNumber)} · <Money cents={closedTotal} variant="plain" />
                  {payment && <> · {PAYMENT_LABEL[payment]}</>}
                </span>
              </>
            ) : undefined
          }
        >
          <div className={styles.confirmTotal}>
            <span>Total a cobrar</span>
            <strong>
              <Money cents={bill.total_cents} />
            </strong>
          </div>
          {bill.unfinished > 0 && (
            <p className={styles.warning}>
              <AlertTriangle size={16} aria-hidden="true" />
              {bill.unfinished === 1
                ? '1 pedido ainda não foi entregue. Confira antes de cobrar.'
                : `${bill.unfinished} pedidos ainda não foram entregues. Confira antes de cobrar.`}
            </p>
          )}
          <ChoiceChips
            label="Forma de pagamento (opcional)"
            options={PAYMENTS}
            value={payment}
            onChange={setPayment}
            allowNone
          />
        </ConfirmDialog>
      )}
    </Sheet>
  )
}
