// Chamadas da API do painel administrativo. Todas enviam o token de login.

import type {
  AdminCustomer,
  AdminCategory,
  AdminReward,
  RewardInput,
  ClubSettings,
  AdminProduct,
  AdminTable,
  AdminUser,
  Dashboard,
  LoginResponse,
  ProductInput,
  StaffInput,
  StaffMember,
  StaffRole,
} from '../types/admin'
import type { BillClosed, TableBill } from '../types/bill'
import type { AdminCall } from '../types/call'
import type { AdminOrder, OrderStatus } from '../types/order'
import { apiBlob, apiRequest } from './api'

let token: string | null = null

export function setAdminToken(value: string | null) {
  token = value
}

const req = <T>(path: string, options: Parameters<typeof apiRequest>[1] = {}) =>
  apiRequest<T>(`/api${path}`, { ...options, token })

// ---------- Autenticação ----------
export const login = (email: string, password: string) =>
  apiRequest<LoginResponse>('/api/auth/login', { method: 'POST', body: { email, password } })
export const getMe = () => req<AdminUser>('/auth/me')

// ---------- Painel ----------
export const getDashboard = (signal?: AbortSignal) => req<Dashboard>('/admin/dashboard', { signal })

// ---------- Categorias ----------
export const listCategories = () => req<AdminCategory[]>('/admin/categories')
export const createCategory = (data: { name: string; description: string | null }) =>
  req<AdminCategory>('/admin/categories', { method: 'POST', body: data })
export const updateCategory = (id: string, data: { name: string; description: string | null }) =>
  req<AdminCategory>(`/admin/categories/${id}`, { method: 'PUT', body: data })
export const deleteCategory = (id: string) => req<void>(`/admin/categories/${id}`, { method: 'DELETE' })
export const uploadCategoryImage = (id: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return req<AdminCategory>(`/admin/categories/${id}/image`, { method: 'POST', body: form, timeoutMs: 60_000 })
}
export const removeCategoryImage = (id: string) =>
  req<AdminCategory>(`/admin/categories/${id}/image`, { method: 'DELETE' })
export const reorderCategories = (ids: string[]) =>
  req<AdminCategory[]>('/admin/categories/order', { method: 'PUT', body: { ids } })

// ---------- Produtos ----------
export const listProducts = () => req<AdminProduct[]>('/admin/products')
export const getProduct = (id: string) => req<AdminProduct>(`/admin/products/${id}`)
export const createProduct = (data: ProductInput) =>
  req<AdminProduct>('/admin/products', { method: 'POST', body: data })
export const updateProduct = (id: string, data: ProductInput) =>
  req<AdminProduct>(`/admin/products/${id}`, { method: 'PUT', body: data })
export const patchProduct = (id: string, data: Partial<Pick<AdminProduct, 'available' | 'featured' | 'price_cents'>>) =>
  req<AdminProduct>(`/admin/products/${id}`, { method: 'PATCH', body: data })
export const deleteProduct = (id: string) => req<void>(`/admin/products/${id}`, { method: 'DELETE' })
export const reorderProducts = (categoryId: string, ids: string[]) =>
  req<AdminProduct[]>('/admin/products/order', { method: 'PUT', body: { category_id: categoryId, ids } })
export function uploadProductImage(id: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return req<AdminProduct>(`/admin/products/${id}/image`, { method: 'POST', body: form, timeoutMs: 60_000 })
}
export const removeProductImage = (id: string) => req<AdminProduct>(`/admin/products/${id}/image`, { method: 'DELETE' })

// ---------- Pedidos ----------
export const listOrders = (signal?: AbortSignal) => req<AdminOrder[]>('/admin/orders', { signal })
export const updateOrderStatus = (id: string, status: OrderStatus, cancelReason?: string) =>
  req<AdminOrder>(`/admin/orders/${id}/status`, {
    method: 'PATCH',
    body: cancelReason ? { status, cancel_reason: cancelReason } : { status },
  })

// ---------- Mesas ----------
export const listTables = () => req<AdminTable[]>('/admin/tables')
type TableInput = { number: number; label: string | null; active: boolean; seats?: number }
export const createTable = (data: TableInput) => req<AdminTable>('/admin/tables', { method: 'POST', body: data })
export const updateTable = (id: string, data: TableInput) =>
  req<AdminTable>(`/admin/tables/${id}`, { method: 'PUT', body: data })
export const regenerateTableQr = (id: string) =>
  req<AdminTable>(`/admin/tables/${id}/qrcode/regenerate`, { method: 'POST' })
/** PNG do QR Code da mesa, pronto para imprimir. */
export const downloadTableQr = (id: string, tipo: 'cardapio' | 'chamar' = 'cardapio') =>
  apiBlob(`/api/admin/tables/${id}/qrcode.png?tipo=${tipo}`, token)

// ---------- Chamados (chamar atendente) ----------
export const listCalls = (signal?: AbortSignal) => req<AdminCall[]>('/admin/chamados', { signal })
export const attendCall = (id: string) => req<AdminCall>(`/admin/chamados/${id}/atender`, { method: 'POST' })

// ---------- Conta da mesa ----------
export const getTableBill = (tableNumber: number) => req<TableBill>(`/admin/chamados/conta/${tableNumber}`)
/** Fecha só os pedidos que o garçom viu (os ids mostrados na tela). */
export type PaymentMethod = 'pix' | 'credito' | 'debito' | 'dinheiro' | 'outro'
export const closeTableBill = (tableNumber: number, orderIds: string[], paymentMethod: PaymentMethod | null = null) =>
  req<BillClosed>(`/admin/chamados/conta/${tableNumber}/fechar`, {
    method: 'POST',
    body: { order_ids: orderIds, payment_method: paymentMethod },
  })

// ---------- Clube Tabajara ----------
export const getClubSettings = () => req<ClubSettings>('/admin/club/settings')
export const updateClubSettings = (data: Omit<ClubSettings, 'credit_on_status'>) =>
  req<ClubSettings>('/admin/club/settings', { method: 'PUT', body: data })
export const searchCustomers = (q: string, signal?: AbortSignal) =>
  req<AdminCustomer[]>(`/admin/club/customers?q=${encodeURIComponent(q)}`, { signal })
export const adjustCustomerPoints = (id: string, points: number, reason: string) =>
  req<AdminCustomer>(`/admin/club/customers/${id}/points`, { method: 'POST', body: { points, reason } })
export const anonymizeCustomer = (id: string) => req<void>(`/admin/club/customers/${id}/anonymize`, { method: 'POST' })
export const setCustomerBirthday = (id: string, day: number, month: number, year: number | null) =>
  req<AdminCustomer>(`/admin/club/customers/${id}/birthday`, { method: 'POST', body: { day, month, year } })

// ---------- Recompensas ----------
export const listRewards = () => req<AdminReward[]>('/admin/club/rewards')
export const createReward = (data: RewardInput) =>
  req<AdminReward>('/admin/club/rewards', { method: 'POST', body: data })
export const updateReward = (id: string, data: RewardInput) =>
  req<AdminReward>(`/admin/club/rewards/${id}`, { method: 'PUT', body: data })
export const deleteReward = (id: string) => req<void>(`/admin/club/rewards/${id}`, { method: 'DELETE' })
export const uploadRewardImage = (id: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return req<AdminReward>(`/admin/club/rewards/${id}/image`, { method: 'POST', body: form, timeoutMs: 60_000 })
}
export const removeRewardImage = (id: string) =>
  req<AdminReward>(`/admin/club/rewards/${id}/image`, { method: 'DELETE' })

export const resetCustomerPin = (id: string, pin: string) =>
  req<AdminCustomer>(`/admin/club/customers/${id}/pin`, { method: 'POST', body: { pin } })
export const deleteTable = (id: string) => req<void>(`/admin/tables/${id}`, { method: 'DELETE' })

// ---------- Equipe (só gerente) ----------
export const listStaff = () => req<StaffMember[]>('/admin/equipe')
export const createStaff = (data: StaffInput) => req<StaffMember>('/admin/equipe', { method: 'POST', body: data })
export const updateStaff = (
  id: string,
  data: Partial<{ name: string; email: string; role: StaffRole; active: boolean }>,
) => req<StaffMember>(`/admin/equipe/${id}`, { method: 'PATCH', body: data })
export const resetStaffPassword = (id: string, password: string) =>
  req<StaffMember>(`/admin/equipe/${id}/senha`, { method: 'POST', body: { password } })
