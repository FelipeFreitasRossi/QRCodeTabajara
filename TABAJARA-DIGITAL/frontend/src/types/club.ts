// Espelha backend/app/schemas/customer.py e club.py

export interface Customer {
  id: string
  name: string
  cpf_tail: string
  phone: string
  email: string | null
  member_since: string
  birth_day: number | null
  birth_month: number | null
}

export interface CustomerSession {
  access_token: string
  token_type: string
  expires_in: number
  customer: Customer
}

export interface CustomerRegister {
  name: string
  cpf: string
  phone: string
  email: string | null
  pin: string
  accept_privacy: true
  /** "Manter conectado neste celular" (o servidor decide quanto tempo). */
  remember?: boolean
  birth_day?: number | null
  birth_month?: number | null
  birth_year?: number | null
}

export interface CustomerUpdate {
  name: string
  phone: string
  email: string | null
}

export interface ClubRules {
  enabled: boolean
  points_per_real: number
  min_order_cents: number
}

export interface ClubSummary {
  balance: number
  lifetime_earned: number
  pending_points: number
  pending_orders: number
  points_per_real: number
}

export type TransactionType = 'credito' | 'estorno' | 'ajuste' | 'resgate' | 'devolucao'

export interface ClubTransaction {
  id: string
  type: TransactionType
  points: number
  reason: string
  order_code: string | null
  balance_after: number | null
  created_at: string
}

export interface TableFromQr {
  number: number
  label: string | null
  token: string
}

export interface Reward {
  id: string
  name: string
  description: string | null
  points_cost: number
  image_url: string | null
  product_id: string | null
  /** ativa e com estoque */
  available: boolean
}

export interface BirthdayStatus {
  enabled: boolean
  has_date: boolean
  day: number | null
  month: number | null
  eligible: boolean
  used_this_year: boolean
  available_from: string | null
  product: { id: string; name: string; image_url: string | null } | null
}
