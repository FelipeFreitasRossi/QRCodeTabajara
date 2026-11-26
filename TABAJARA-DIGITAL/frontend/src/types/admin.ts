// Espelha backend/app/schemas/auth.py e catalog.py

import type { AdminOrder } from './order'

/** "admin" = gerente (acesso total); "garcom" = chamados, pedidos e contas. */
export type StaffRole = 'admin' | 'garcom'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
}

/** Só o gerente mexe em cardápio, preços, Clube, mesas e equipe. O servidor confere de novo. */
export const isManager = (user: Pick<AdminUser, 'role'> | null | undefined) => user?.role === 'admin'

export const ROLE_LABEL: Record<string, string> = { admin: 'Gerente', garcom: 'Garçom' }

// Espelha backend/app/schemas/staff.py
export interface StaffMember {
  id: string
  name: string
  email: string
  role: StaffRole
  active: boolean
  /** Bloqueado por muitas senhas erradas (libera sozinho em 15 min ou com senha nova). */
  locked: boolean
  is_me: boolean
  created_at: string
}

export interface StaffInput {
  name: string
  email: string
  password: string
  role: StaffRole
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  admin: AdminUser
}

export interface AdminCategory {
  id: string
  name: string
  slug: string
  description: string | null
  position: number
  product_count: number
  /** Foto da seção no cardápio (só nas seções de comida). */
  image_url: string | null
}

export interface AdminProduct {
  id: string
  name: string
  slug: string
  category_id: string
  description: string | null
  price_cents: number
  image_url: string | null
  ingredients: string[]
  allergens: string[]
  featured: boolean
  available: boolean
  position: number
  updated_at: string
}

export interface ProductInput {
  name: string
  category_id: string
  description: string | null
  price_cents: number
  ingredients: string[]
  allergens: string[]
  featured: boolean
  available: boolean
}

export interface AdminTable {
  id: string
  number: number
  slug: string
  label: string | null
  active: boolean
  seats: number
  /** Endereço gravado no QR Code da mesa. */
  qr_url: string | null
  /** Endereço do QR de chamar atendente (página isolada, sem cardápio). */
  call_url?: string | null
}

export interface Dashboard {
  orders_today: number
  revenue_today_cents: number
  active_orders: number
  pending_orders: number
  products: number
  unavailable_products: number
  categories: number
  recent_orders: AdminOrder[]
}

// ---------- Clube Tabajara ----------
export interface ClubSettings {
  enabled: boolean
  points_per_real: number
  min_order_cents: number
  excluded_category_ids: string[]
  credit_on_status: string
  min_reward_points: number
  birthday_enabled: boolean
  birthday_product_id: string | null
  birthday_min_days: number
}

export interface AdminCustomer {
  id: string
  name: string
  cpf_tail: string
  phone: string
  email: string | null
  balance: number
  lifetime_earned: number
  member_since: string
  locked: boolean
  birthday: string | null
}

export interface AdminReward {
  id: string
  name: string
  description: string | null
  points_cost: number
  image_url: string | null
  product_id: string | null
  available: boolean
  active: boolean
  stock: number | null
  position: number
  redeemed_count: number
}

export interface RewardInput {
  name: string
  description: string | null
  points_cost: number
  product_id: string | null
  active: boolean
  stock: number | null
  position: number
}
