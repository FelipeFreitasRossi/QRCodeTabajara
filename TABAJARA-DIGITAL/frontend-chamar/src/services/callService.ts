import type { CallPage, CallReason, PublicTable } from '../types'
import { apiGet, apiRequest } from './api'

/** Com o QR: o código secreto da mesa. Sem QR: o número da mesa escolhida pelo cliente. */
export type CallTarget = { token: string } | { number: number }

const base = (target: CallTarget) =>
  'token' in target
    ? `/api/public/chamados/${encodeURIComponent(target.token)}`
    : `/api/public/chamados/mesa/${target.number}`

export function getCallPage(target: CallTarget, signal?: AbortSignal): Promise<CallPage> {
  return apiGet<CallPage>(base(target), { signal })
}

export function createCall(target: CallTarget, reason: CallReason): Promise<CallPage> {
  return apiRequest<CallPage>(base(target), { method: 'POST', body: { reason } })
}

export function cancelCall(target: CallTarget): Promise<CallPage> {
  return apiRequest<CallPage>(`${base(target)}/cancelar`, { method: 'POST' })
}

/** Mesas ativas, para o cliente escolher a sua. */
export function getTables(signal?: AbortSignal): Promise<PublicTable[]> {
  return apiGet<PublicTable[]>('/api/public/mesas', { signal })
}
