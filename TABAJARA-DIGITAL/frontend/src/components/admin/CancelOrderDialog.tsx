import { useState } from 'react'
import type { ReactNode } from 'react'
import { Ban, Copy, Gift, PackageX, PencilLine, Sparkles, Undo2, UserX, X } from 'lucide-react'

import type { AdminOrder } from '../../types/order'
import { ORDER_STATUS_LABEL } from '../../types/order'
import { cx } from '../../utils/dom'
import { formatPoints, timeAgo } from '../../utils/format'
import { Money } from '../ui/Money'
import { ChoiceChips, ConfirmDialog } from './ConfirmDialog'
import styles from './CancelOrderDialog.module.css'

type Reason = 'Cliente desistiu' | 'Item em falta' | 'Pedido duplicado' | 'Feito por engano' | 'outro'

const REASONS: { value: Reason; label: string; icon: ReactNode }[] = [
  { value: 'Cliente desistiu', label: 'Cliente desistiu', icon: <UserX size={15} /> },
  { value: 'Item em falta', label: 'Item em falta', icon: <PackageX size={15} /> },
  { value: 'Pedido duplicado', label: 'Pedido duplicado', icon: <Copy size={15} /> },
  { value: 'Feito por engano', label: 'Feito por engano', icon: <Undo2 size={15} /> },
  { value: 'outro', label: 'Outro', icon: <PencilLine size={15} /> },
]
const OTHER_MAX = 200

const MAX_ITEMS = 4

interface CancelOrderDialogProps {
  order: AdminOrder
  open: boolean
  onClose: () => void
  onExited: () => void
  /** Cancela de fato; se der erro, o pop-up continua aberto. */
  onConfirm: (reason: string) => Promise<void>
}

/** Pop-up de cancelamento: mostra o pedido, exige o motivo e avisa o que acontece com o Clube. */
export function CancelOrderDialog({ order, open, onClose, onExited, onConfirm }: CancelOrderDialogProps) {
  const [reason, setReason] = useState<Reason | null>(null)
  const [other, setOther] = useState('')
  const [busy, setBusy] = useState(false)
  const finalReason = reason === 'outro' ? other.trim() : reason ?? ''
  const pad = (n: number) => String(n).padStart(2, '0')

  const confirm = async () => {
    if (!finalReason) return
    setBusy(true)
    try {
      await onConfirm(finalReason)
      onClose()
    } catch {
      // o aviso de erro já aparece no painel; o pop-up continua aberto para tentar de novo
    } finally {
      setBusy(false)
    }
  }

  const clubNotes: { icon: ReactNode; text: string }[] = []
  if (order.loyalty_credited && order.loyalty_points > 0)
    clubNotes.push({ icon: <Sparkles size={14} />, text: `Os ${formatPoints(order.loyalty_points)} pontos creditados serão estornados.` })
  if (order.points_spent > 0)
    clubNotes.push({ icon: <Gift size={14} />, text: `Os ${formatPoints(order.points_spent)} pontos usados em resgates voltam para o cliente.` })
  if (order.birthday_gift)
    clubNotes.push({ icon: <Gift size={14} />, text: 'O presente de aniversário volta a ficar disponível para o cliente.' })

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onExited={onExited}
      tone="danger"
      icon={<Ban size={24} strokeWidth={1.8} />}
      eyebrow={`Mesa ${pad(order.table_number)} · #${order.short_code}`}
      title="Cancelar este pedido?"
      description="O pedido sai da fila da cozinha e não entra na conta da mesa. Não dá para desfazer."
      confirmLabel="Cancelar pedido"
      confirmIcon={<X size={18} strokeWidth={2.4} />}
      cancelLabel="Voltar"
      busy={busy}
      canConfirm={Boolean(finalReason)}
      onConfirm={() => void confirm()}
    >
      <div className={styles.summary}>
        <div className={styles.summaryHead}>
          <div className={styles.who}>
            <strong>{order.customer_name}</strong>
            <span className={styles.meta}>
              <span className={cx(styles.status, styles[`s_${order.status}`])}>{ORDER_STATUS_LABEL[order.status]}</span>
              feito {timeAgo(order.created_at)}
            </span>
          </div>
          <span className={styles.total}>
            <Money cents={order.total_cents} variant="plain" />
          </span>
        </div>
        <ul className={styles.items}>
          {order.items.slice(0, MAX_ITEMS).map((item, i) => (
            <li key={i}>
              <span className={styles.qty}>{item.quantity}×</span>
              <span className={styles.itemName}>{item.name}</span>
              <span className={styles.itemPrice}>
                {item.subtotal_cents === 0 ? 'grátis' : <Money cents={item.subtotal_cents} variant="plain" />}
              </span>
            </li>
          ))}
          {order.items.length > MAX_ITEMS && <li className={styles.more}>+ {order.items.length - MAX_ITEMS} itens</li>}
        </ul>
      </div>

      {clubNotes.length > 0 && (
        <ul className={styles.club}>
          {clubNotes.map((note) => (
            <li key={note.text}>
              {note.icon}
              {note.text}
            </li>
          ))}
        </ul>
      )}

      <ChoiceChips label="Motivo do cancelamento" options={REASONS} value={reason} onChange={setReason} />
      {reason === 'outro' && (
        <div className={styles.otherWrap}>
          <textarea
            className={styles.other}
            value={other}
            onChange={(event) => setOther(event.target.value)}
            maxLength={OTHER_MAX}
            rows={2}
            placeholder="Escreva o motivo"
            aria-label="Motivo do cancelamento"
            autoFocus
          />
          <span className={styles.counter}>
            {other.length}/{OTHER_MAX}
          </span>
        </div>
      )}
      <p className={cx(styles.hint, finalReason && styles.hintOk)} aria-live="polite">
        {finalReason ? `Motivo: ${finalReason}` : 'Escolha o motivo para poder cancelar.'}
      </p>
    </ConfirmDialog>
  )
}
