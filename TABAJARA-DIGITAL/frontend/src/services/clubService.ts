// Clube Tabajara: conta do cliente (CPF + PIN), saldo, extrato e estimativa de pontos.

import type {
  BirthdayStatus,
  Reward,
  ClubRules,
  ClubSummary,
  ClubTransaction,
  Customer,
  CustomerRegister,
  CustomerSession,
  CustomerUpdate,
} from '../types/club'
import type { PublicTable } from '../types/order'
import { apiGet, apiRequest } from './api'

let token: string | null = null

export function setCustomerToken(value: string | null) {
  token = value
}

export function getCustomerToken(): string | null {
  return token
}

const authed = <T>(path: string, options: Parameters<typeof apiRequest>[1] = {}) =>
  apiRequest<T>(path, { ...options, token, scope: 'customer' })

export const register = (data: CustomerRegister) =>
  apiRequest<CustomerSession>('/api/customers/register', { method: 'POST', body: data })

export const login = (cpf: string, pin: string, remember = false) =>
  apiRequest<CustomerSession>('/api/customers/login', { method: 'POST', body: { cpf, pin, remember } })

export const getMe = () => authed<Customer>('/api/customers/me')
export const updateMe = (data: CustomerUpdate) => authed<Customer>('/api/customers/me', { method: 'PUT', body: data })

export const getSummary = (signal?: AbortSignal) => authed<ClubSummary>('/api/club/me', { signal })
export const getTransactions = (signal?: AbortSignal) =>
  authed<ClubTransaction[]>('/api/club/me/transactions', { signal })

export const getRules = (signal?: AbortSignal) => apiGet<ClubRules>('/api/public/club', { signal })

export const estimatePoints = (items: { product_id: string; quantity: number }[], signal?: AbortSignal) =>
  apiRequest<{ points: number }>('/api/public/club/estimate', { method: 'POST', body: { items }, signal })

export const tableByQr = (qrToken: string, signal?: AbortSignal) =>
  apiGet<PublicTable>(`/api/public/mesas/qr/${encodeURIComponent(qrToken)}`, { signal })

// ---------- Favoritos (salvos na conta do cliente) ----------
export const getFavorites = (signal?: AbortSignal) => authed<string[]>('/api/customers/me/favorites', { signal })
export const addFavorite = (productId: string) =>
  authed<string[]>(`/api/customers/me/favorites/${encodeURIComponent(productId)}`, { method: 'PUT' })
export const removeFavorite = (productId: string) =>
  authed<string[]>(`/api/customers/me/favorites/${encodeURIComponent(productId)}`, { method: 'DELETE' })

// ---------- Recompensas e aniversário ----------
export const getRewards = (signal?: AbortSignal) => apiGet<Reward[]>('/api/public/club/rewards', { signal })
export const getBirthday = (signal?: AbortSignal) => authed<BirthdayStatus>('/api/club/me/birthday', { signal })
export const setBirthday = (day: number, month: number, year: number | null) =>
  authed<Customer>('/api/customers/me/birthday', { method: 'PUT', body: { day, month, year } })
