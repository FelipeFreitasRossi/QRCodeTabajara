// Mesa identificada pelo QR Code. Fica só nesta aba/visita (sessionStorage):
// quem sai do restaurante e reabre o site depois não fica preso à mesa antiga.

import type { TableFromQr } from '../types/club'

const KEY = 'tabajara:mesa-qr'
const MAX_AGE_MS = 6 * 60 * 60 * 1000 // 6 horas

interface Stored extends TableFromQr {
  at: number
}

export function saveQrTable(table: TableFromQr): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...table, at: Date.now() } satisfies Stored))
  } catch {
    // sem armazenamento: o cliente escolhe a mesa no carrinho
  }
}

export function readQrTable(): TableFromQr | null {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Stored
    if (typeof data.number !== 'number' || Date.now() - data.at > MAX_AGE_MS) return null
    return { number: data.number, label: data.label ?? null, token: data.token }
  } catch {
    return null
  }
}

export function clearQrTable(): void {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // nada a fazer
  }
}

export const formatTable = (n: number) => `Mesa ${String(n).padStart(2, '0')}`
