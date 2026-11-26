import { useState } from 'react'
import type { ReactNode } from 'react'
import { Ban, Gift, Sparkles, X } from 'lucide-react'

import type { AdminOrder } from '../../types/order'
import { formatPoints } from '../../utils/format'
import { Money } from '../ui/Money'
import { ChoiceChips, ConfirmDialog } from './ConfirmDialog'
import styles from './CancelOrderDialog.module.css'

const REASONS = [
  { value: 'Cliente desistiu', label: 'Cliente desistiu' },
  { value: 'Item em falta', label: 'Item em falta' },
  { value: 'Pedido duplicado', label: 'Pedido duplicado' },
  { value: 'Feito por engano', label: 'Feito por engano' },
  { value: 'outro', label: 'Outro' },
] as const

type Reason = (typeof REASONS)[number]['value']

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
          <strong>{order.customer_name}</strong>
          <Money cents={order.total_cents} variant="plain" />
        </div>
        <ul className={styles.items}>
          {order.items.slice(0, MAX_ITEMS).map((item, i) => (
            <li key={i}>
              <span className={styles.qty}>{item.quantity}×</span> {item.name}
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

      <ChoiceChips label="Motivo do cancelamento" options={[...REASONS]} value={reason} onChange={setReason} />
      {reason === 'outro' && (
        <input
          className={styles.other}
          value={other}
          onChange={(event) => setOther(event.target.value)}
          maxLength={200}
          placeholder="Escreva o motivo"
          aria-label="Motivo do cancelamento"
          autoFocus
        />
      )}
      {!finalReason && <p className={styles.hint}>Escolha o motivo para poder cancelar.</p>}
    </ConfirmDialog>
  )
}
