// Onde e por quanto tempo a sessão do Clube fica no aparelho.
//
// - Padrão (visita): sessionStorage — some ao fechar a aba — e no máximo o prazo do
//   servidor (3 h). Sai sozinha após 30 min sem uso.
// - "Manter conectado neste celular": localStorage, pelo prazo maior do servidor.
//
// O token nunca vale mais do que o servidor determinou (expiresAt vem do servidor).

import type { Customer } from '../types/club'
import { readJSON, readSessionJSON, STORAGE_KEYS, writeJSON, writeSessionJSON } from './storage'

export const INACTIVITY_MS = 30 * 60 * 1000
const CONFIRM_KEY = 'tabajara:clube-confirmar'
const ACTIVITY_KEY = 'tabajara:clube-atividade'

export interface StoredSession {
  token: string
  customer: Customer
  expiresAt: number
  remember: boolean
}

function valid(session: StoredSession | null): session is StoredSession {
  return Boolean(
    session &&
    typeof session.token === 'string' &&
    typeof session.remember === 'boolean' && // sessões antigas (sem a opção) são descartadas
    session.expiresAt > Date.now(),
  )
}

export function loadSession(): StoredSession | null {
  const visit = readSessionJSON<StoredSession | null>(STORAGE_KEYS.club, null)
  if (valid(visit)) {
    if (Date.now() - lastActivity() > INACTIVITY_MS) return null
    return visit
  }
  const kept = readJSON<StoredSession | null>(STORAGE_KEYS.club, null)
  if (valid(kept) && kept.remember) return kept
  // vencida ou de versão antiga: limpa
  writeJSON(STORAGE_KEYS.club, null)
  writeSessionJSON(STORAGE_KEYS.club, null)
  return null
}

export function saveSession(session: StoredSession | null): void {
  writeJSON(STORAGE_KEYS.club, null)
  writeSessionJSON(STORAGE_KEYS.club, null)
  if (!session) return
  if (session.remember) writeJSON(STORAGE_KEYS.club, session)
  else {
    writeSessionJSON(STORAGE_KEYS.club, session)
    touchActivity()
  }
}

// ---------- atividade (para a saída automática) ----------

export function lastActivity(): number {
  return readSessionJSON<number>(ACTIVITY_KEY, Date.now())
}

export function touchActivity(): void {
  writeSessionJSON(ACTIVITY_KEY, Date.now())
}

// ---------- "Continuar como Marina?" depois de escanear o QR ----------

export function requestIdentityConfirmation(): void {
  writeSessionJSON(CONFIRM_KEY, true)
}

export function needsIdentityConfirmation(): boolean {
  return readSessionJSON<boolean>(CONFIRM_KEY, false)
}

export function clearIdentityConfirmation(): void {
  writeSessionJSON(CONFIRM_KEY, null)
}
