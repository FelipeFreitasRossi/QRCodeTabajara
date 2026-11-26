import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Banknote, Check, CreditCard, QrCode, ReceiptText, Users, Wallet } from 'lucide-react'

import { useAdmin } from '../../hooks/useAdmin'
import { errorMessage } from '../../services/api'
import * as api from '../../services/adminService'
import type { PaymentMethod } from '../../services/adminService'
import type { TableBill } from '../../types/bill'
import { cx } from '../../utils/dom'
import { formatPrice, parsePriceToCents } from '../../utils/format'
import { Money } from '../ui/Money'
import { QuantityStepper } from '../ui/QuantityStepper'
import { ChoiceChips, ConfirmDialog } from './ConfirmDialog'
import styles from './CloseBillDialog.module.css'

const PAYMENTS: { value: PaymentMethod; label: string; icon: ReactNode }[] = [
  { value: 'pix', label: 'Pix', icon: <QrCode size={15} /> },
  { value: 'credito', label: 'Crédito', icon: <CreditCard size={15} /> },
  { value: 'debito', label: 'Débito', icon: <CreditCard size={15} /> },
  { value: 'dinheiro', label: 'Dinheiro', icon: <Banknote size={15} /> },
  { value: 'outro', label: 'Outro', icon: <Wallet size={15} /> },
]
export const PAYMENT_LABEL = Object.fromEntries(PAYMENTS.map((p) => [p.value, p.label])) as Record<PaymentMethod, string>

const pad = (n: number) => String(n).padStart(2, '0')

/** Sugestões de valor recebido em dinheiro: próximos valores "redondos" acima do total. */
function cashSuggestions(total: number): number[] {
  const steps = [1000, 5000, 10000, 20000] // R$ 10, 50, 100, 200
  const values = steps.map((step) => Math.ceil(total / step) * step).filter((v) => v > total)
  return [...new Set(values)].slice(0, 3)
}

/** Divide sem perder centavos: ex. R$ 100,00 / 3 = 33,34 + 33,33 + 33,33. */
function split(total: number, people: number) {
  const base = Math.floor(total / people)
  const extra = total - base * people // quantas pessoas pagam 1 centavo a mais
  return { base, extra }
}

interface CloseBillDialogProps {
  tableNumber: number
  bill: TableBill
  open: boolean
  onClose: () => void
  onExited: () => void
  /** Conta fechada: o painel de baixo também fecha. */
  onDone: () => void
}

/** "Fechar a conta?": total, forma de pagamento, troco, divisão entre pessoas e resumo final. */
export function CloseBillDialog({ tableNumber, bill, open, onClose, onExited, onDone }: CloseBillDialogProps) {
  const { notify } = useAdmin()
  const [payment, setPayment] = useState<PaymentMethod | null>(null)
  const [received, setReceived] = useState('')
  const [people, setPeople] = useState(1)
  const [busy, setBusy] = useState(false)
  const [closedTotal, setClosedTotal] = useState<number | null>(null)

  const total = bill.total_cents
  const receivedCents = payment === 'dinheiro' ? parsePriceToCents(received) : null
  const change = receivedCents !== null ? receivedCents - total : null
  const suggestions = useMemo(() => cashSuggestions(total), [total])
  const parts = split(total, people)

  const confirm = async () => {
    setBusy(true)
    try {
      const result = await api.closeTableBill(
        tableNumber,
        bill.orders.map((o) => o.id),
        payment,
      )
      if (result.closed_orders < bill.orders.length) notify('Alguns pedidos já tinham sido fechados por outra pessoa.', { kind: 'info' })
      notify(`Mesa ${pad(tableNumber)} · ${formatPrice(result.total_cents)}${payment ? ` · ${PAYMENT_LABEL[payment]}` : ''}`, {
        title: 'Conta fechada',
      })
      setClosedTotal(result.total_cents)
    } catch (err) {
      notify(errorMessage(err, 'Não foi possível fechar a conta.'))
    } finally {
      setBusy(false)
    }
  }

  const finish = () => {
    onClose()
    onDone()
  }

  const success =
    closedTotal !== null ? (
      <>
        <span className={styles.doneIcon} aria-hidden="true">
          <svg viewBox="0 0 52 52" width="40" height="40">
            <path d="M14 27.5 L22.5 36 L39 18" />
          </svg>
        </span>
        <strong className={styles.doneTitle}>Conta fechada</strong>
        <span className={styles.doneSub}>Mesa {pad(tableNumber)} · a mesa está livre para os próximos clientes</span>
        <dl className={styles.receipt}>
          <div>
            <dt>Total</dt>
            <dd>
              <Money cents={closedTotal} variant="plain" />
            </dd>
          </div>
          {payment && (
            <div>
              <dt>Pagamento</dt>
              <dd>{PAYMENT_LABEL[payment]}</dd>
            </div>
          )}
          {receivedCents !== null && change !== null && change >= 0 && (
            <>
              <div>
                <dt>Recebido</dt>
                <dd>{formatPrice(receivedCents)}</dd>
              </div>
              <div className={styles.changeRow}>
                <dt>Troco</dt>
                <dd>{formatPrice(change)}</dd>
              </div>
            </>
          )}
          {people > 1 && (
            <div>
              <dt>Dividida</dt>
              <dd>
                {people} × {formatPrice(parts.base + (parts.extra ? 1 : 0))}
              </dd>
            </div>
          )}
        </dl>
        <button type="button" className={styles.doneButton} onClick={finish}>
          Concluir
        </button>
      </>
    ) : undefined

  return (
    <ConfirmDialog
      open={open}
      onClose={closedTotal !== null ? finish : onClose}
      onExited={onExited}
      tone="gold"
      icon={<ReceiptText size={24} strokeWidth={1.7} />}
      eyebrow={`Mesa ${pad(tableNumber)}`}
      title="Fechar a conta?"
      description={
        <>
          {bill.orders.length} {bill.orders.length === 1 ? 'pedido' : 'pedidos'}
          {bill.names.length > 0 && <> de {bill.names.join(', ')}</>}. Os próximos clientes desta mesa começam com a conta
          zerada.
        </>
      }
      confirmLabel="Fechar conta"
      confirmIcon={<Check size={18} strokeWidth={2.6} />}
      busy={busy}
      onConfirm={() => void confirm()}
      success={success}
    >
      <div className={styles.total}>
        <span>Total a cobrar</span>
        <strong>
          <Money cents={total} />
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

      {/* Dividir a conta */}
      <div className={styles.split}>
        <span className={styles.splitLabel}>
          <Users size={16} aria-hidden="true" /> Dividir entre
        </span>
        <QuantityStepper size="sm" value={people} min={1} max={30} onChange={setPeople} label="pessoas" />
        <span className={styles.splitResult} aria-live="polite">
          {people === 1 ? (
            'sem divisão'
          ) : parts.extra === 0 ? (
            <>
              <strong>{formatPrice(parts.base)}</strong> cada
            </>
          ) : (
            <>
              <strong>{formatPrice(parts.base + 1)}</strong> × {parts.extra} e <strong>{formatPrice(parts.base)}</strong> ×{' '}
              {people - parts.extra}
            </>
          )}
        </span>
      </div>

      <ChoiceChips label="Forma de pagamento (opcional)" options={PAYMENTS} value={payment} onChange={setPayment} allowNone />

      {payment === 'dinheiro' && (
        <div className={styles.cash}>
          <label className={styles.cashLabel} htmlFor="valor-recebido">
            Valor recebido
          </label>
          <div className={styles.cashRow}>
            <span className={styles.cashPrefix}>R$</span>
            <input
              id="valor-recebido"
              className={styles.cashInput}
              inputMode="decimal"
              placeholder="0,00"
              value={received}
              onChange={(event) => setReceived(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className={styles.cashQuick}>
            {suggestions.map((value) => (
              <button key={value} type="button" className={styles.cashChip} onClick={() => setReceived((value / 100).toFixed(2).replace('.', ','))}>
                {formatPrice(value)}
              </button>
            ))}
            <button type="button" className={styles.cashChip} onClick={() => setReceived((total / 100).toFixed(2).replace('.', ','))}>
              Valor exato
            </button>
          </div>
          {change !== null && (
            <p className={cx(styles.change, change < 0 && styles.changeShort)} aria-live="polite">
              {change >= 0 ? (
                <>
                  Troco <strong>{formatPrice(change)}</strong>
                </>
              ) : (
                <>
                  Faltam <strong>{formatPrice(-change)}</strong>
                </>
              )}
            </p>
          )}
        </div>
      )}
    </ConfirmDialog>
  )
}
