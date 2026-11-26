export type CallReason = 'atendente' | 'conta' | 'ajuda'
export type CallStatus = 'aberto' | 'atendido' | 'cancelado'

export interface PublicTable {
  number: number
  label: string | null
}

export interface PublicCall {
  id: string
  reason: CallReason
  status: CallStatus
  created_at: string
  attended_at: string | null
}

export interface CallPage {
  /** null: aberto sem o QR (chamado "sem mesa") */
  table: PublicTable | null
  call: PublicCall | null
  cooldown_seconds: number
}
