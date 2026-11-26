import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BellRing, Check, CircleHelp, Loader2, ReceiptText, RefreshCw } from 'lucide-react'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { BillSheet } from '../../components/admin/BillSheet'
import { Money } from '../../components/ui/Money'
import { Button } from '../../components/ui/Button'
import { useAdmin } from '../../hooks/useAdmin'
import { errorMessage } from '../../services/api'
import type { AdminCall, CallReason } from '../../types/call'
import { CALL_REASON_LABEL, callTableName } from '../../types/call'
import { cx } from '../../utils/dom'
import styles from './CallsPage.module.css'

/** A partir de quantos minutos o chamado aparece como "esperando muito". */
const LATE_MINUTES = 3

const REASON_ICON: Record<CallReason, ReactNode> = {
  atendente: <BellRing size={18} strokeWidth={1.75} />,
  conta: <ReceiptText size={18} strokeWidth={1.75} />,
  ajuda: <CircleHelp size={18} strokeWidth={1.75} />,
}

const pad = (n: number) => String(n).padStart(2, '0')

function waited(iso: string, now: number): { text: string; minutes: number } {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  const minutes = Math.floor(seconds / 60)
  if (seconds < 60) return { text: `${seconds} s`, minutes }
  return { text: `${minutes} min`, minutes }
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Mesas chamando, em tempo real (o painel consulta a cada poucos segundos e toca um aviso). */
export function CallsPage() {
  const { calls, callsError, refreshCalls, attendCall, notify } = useAdmin()
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState<string | null>(null)
  // Conta aberta no painel lateral: mesa e se o painel está visível (mantido montado durante a animação de saída)
  const [billTable, setBillTable] = useState<number | null>(null)
  const [billOpen, setBillOpen] = useState(false)
  const openBill = (n: number) => {
    setBillTable(n)
    setBillOpen(true)
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const open = (calls ?? []).filter((c) => c.status === 'aberto')
  const closed = (calls ?? []).filter((c) => c.status !== 'aberto')

  const handleAttend = async (call: AdminCall) => {
    setBusy(call.id)
    try {
      await attendCall(call.id)
      notify(`${callTableName(call.table_number)} atendida`)
    } catch (error) {
      notify(errorMessage(error, 'Não foi possível marcar como atendido.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Chamados"
        subtitle={
          <span className={styles.live}>
            <span className={styles.dot} aria-hidden="true" />
            Mesas que tocaram em "Chamar atendente". Atualiza sozinho.
          </span>
        }
        actions={
          <Button onClick={() => void refreshCalls()} icon={<RefreshCw size={16} aria-hidden="true" />}>
            Atualizar
          </Button>
        }
      />

      {callsError && (
        <p className={styles.error} role="alert">
          {callsError}
        </p>
      )}

      {calls === null ? (
        <p className={styles.loading}>
          <Loader2 size={16} className={styles.spin} aria-hidden="true" /> Carregando chamados…
        </p>
      ) : open.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <BellRing size={28} strokeWidth={1.4} />
          </span>
          <strong>Nenhuma mesa chamando</strong>
          <span>Quando um cliente tocar em "Chamar atendente", aparece aqui com um aviso sonoro.</span>
        </div>
      ) : (
        <ul className={styles.grid} aria-label="Chamados abertos">
          {open.map((call) => {
            const wait = waited(call.created_at, now)
            const late = wait.minutes >= LATE_MINUTES
            return (
              <li key={call.id} className={cx(styles.card, late && styles.late, call.reason === 'conta' && styles.bill)}>
                <div className={styles.cardTop}>
                  <div className={styles.table}>
                    <span className={styles.tableWord}>{call.table_number == null ? 'Sem mesa' : 'Mesa'}</span>
                    <span className={styles.tableNumber}>{call.table_number == null ? '—' : pad(call.table_number)}</span>
                  </div>
                  <span className={styles.wait} title={`Chamou às ${clock(call.created_at)}`}>
                    {wait.text}
                  </span>
                </div>
                <p className={styles.reason}>
                  {REASON_ICON[call.reason]}
                  {CALL_REASON_LABEL[call.reason]}
                </p>
                <p className={styles.meta}>
                  {call.table_label && <span>{call.table_label}</span>}
                  {call.table_number == null && <span>teste sem QR Code</span>}
                  {call.repeats > 0 && <span className={styles.repeats}>chamou {call.repeats + 1}×</span>}
                  {late && <span className={styles.lateText}>esperando há {wait.minutes} min</span>}
                </p>
                {call.reason === 'conta' && call.table_number != null && (
                  <button type="button" className={styles.billBox} onClick={() => openBill(call.table_number!)}>
                    {call.bill && call.bill.orders_count > 0 ? (
                      <>
                        <span className={styles.billTotal}>
                          <Money cents={call.bill.total_cents} />
                        </span>
                        <span className={styles.billMeta}>
                          {call.bill.orders_count} {call.bill.orders_count === 1 ? 'pedido' : 'pedidos'}
                          {call.bill.names.length > 0 && ` · ${call.bill.names.join(', ')}`}
                        </span>
                        {call.bill.unfinished > 0 && (
                          <span className={styles.billWarn}>
                            {call.bill.unfinished} ainda não {call.bill.unfinished === 1 ? 'entregue' : 'entregues'}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className={styles.billMeta}>Nenhum pedido pelo site nesta mesa</span>
                    )}
                    <span className={styles.billLink}>Ver conta e fechar →</span>
                  </button>
                )}
                {call.reason === 'conta' && call.table_number == null && (
                  <p className={styles.billMeta}>Mesa não identificada (teste sem QR): pergunte a mesa ao cliente.</p>
                )}
                <Button
                  variant="primary"
                  block
                  onClick={() => void handleAttend(call)}
                  disabled={busy === call.id}
                  icon={
                    busy === call.id ? (
                      <Loader2 size={18} className={styles.spin} aria-hidden="true" />
                    ) : (
                      <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                    )
                  }
                >
                  Atendido
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {billTable !== null && (
        <BillSheet
          tableNumber={billTable}
          open={billOpen}
          onClose={() => setBillOpen(false)}
          onExited={() => setBillTable(null)}
          onClosed={() => void refreshCalls()}
        />
      )}

      {closed.length > 0 && (
        <section className={styles.history} aria-labelledby="chamados-encerrados">
          <h2 id="chamados-encerrados" className={styles.historyTitle}>
            Encerrados nas últimas 3 horas
          </h2>
          <ul className={styles.historyList}>
            {closed.map((call) => (
              <li key={call.id}>
                <span className={styles.historyTable}>{callTableName(call.table_number)}</span>
                <span className={styles.historyReason}>
                  {REASON_ICON[call.reason]} {CALL_REASON_LABEL[call.reason]}
                </span>
                <span className={styles.historyStatus}>
                  {call.status === 'atendido'
                    ? `Atendido${call.attended_by ? ` por ${call.attended_by.split(' ')[0]}` : ''} às ${clock(call.attended_at ?? call.updated_at)}`
                    : `Cancelado pelo cliente às ${clock(call.updated_at)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
