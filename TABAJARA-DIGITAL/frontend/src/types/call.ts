import type { BillSummary } from './bill'

export type CallReason = 'atendente' | 'conta' | 'ajuda'
export type CallStatus = 'aberto' | 'atendido' | 'cancelado'

export const CALL_REASON_LABEL: Record<CallReason, string> = {
  atendente: 'Chamar atendente',
  conta: 'Pedir a conta',
  ajuda: 'Ajuda com o pedido',
}

/** "Mesa 07" ou "Sem mesa" (chamado de teste, feito sem o QR). */
export const callTableName = (n: number | null) => (n == null ? 'Sem mesa' : `Mesa ${String(n).padStart(2, '0')}`)

export interface AdminCall {
  id: string
  /** null: chamado feito sem o QR (teste), "sem mesa" */
  table_number: number | null
  table_label: string | null
  reason: CallReason
  status: CallStatus
  repeats: number
  created_at: string
  updated_at: string
  attended_at: string | null
  attended_by: string | null
  /** Só em "Pedir a conta" aberto de uma mesa: resumo do que cobrar. */
  bill?: BillSummary | null
}
