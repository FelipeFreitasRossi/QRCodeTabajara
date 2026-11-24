import { Gift, Minus, Plus, ReceiptText, SlidersHorizontal, Undo2 } from 'lucide-react'

import type { ClubTransaction, TransactionType } from '../../types/club'
import { cx } from '../../utils/dom'
import { formatDate, formatPoints } from '../../utils/format'
import { Points } from '../ui/Money'
import { Reveal } from '../ui/Reveal'
import styles from './TransactionList.module.css'

const META: Record<TransactionType, { label: string; icon: typeof Plus }> = {
  credito: { label: 'Pedido', icon: Plus },
  estorno: { label: 'Estorno', icon: Undo2 },
  ajuste: { label: 'Ajuste da equipe', icon: SlidersHorizontal },
  resgate: { label: 'Resgate', icon: Gift },
  devolucao: { label: 'Resgate devolvido', icon: Undo2 },
}

/** Extrato do Clube: cada movimentação surge em cascata ao rolar. */
export function TransactionList({ items }: { items: ClubTransaction[] }) {
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <ReceiptText size={26} strokeWidth={1.4} aria-hidden="true" />
        <p>Seu extrato aparece aqui.</p>
        <p className={styles.emptyHint}>Faça um pedido informando seu CPF e acompanhe os pontos entrando.</p>
      </div>
    )
  }

  return (
    <ol className={styles.list}>
      {items.map((t, i) => {
        const { label, icon: Icon } = META[t.type]
        const positive = t.points > 0
        return (
          <li key={t.id}>
            <Reveal delay={Math.min(i, 6) * 60}>
              <div className={styles.row}>
                <span className={cx(styles.icon, positive ? styles.plus : styles.minus)} aria-hidden="true">
                  {t.type === 'ajuste' && !positive ? <Minus size={16} /> : <Icon size={16} />}
                </span>
                <span className={styles.text}>
                  <span className={styles.title}>{t.order_code ? `${label} #${t.order_code}` : label}</span>
                  <span className={styles.meta}>
                    {formatDate(t.created_at)}
                    {t.type === 'ajuste' && t.reason ? ` · ${t.reason}` : ''}
                  </span>
                </span>
                <span className={styles.amount}>
                  <Points
                    value={t.points}
                    signed
                    unit=""
                    className={cx(styles.points, positive ? styles.plusText : styles.minusText)}
                  />
                  {t.balance_after !== null && (
                    <span className={styles.after}>saldo {formatPoints(t.balance_after)}</span>
                  )}
                </span>
              </div>
            </Reveal>
          </li>
        )
      })}
    </ol>
  )
}
