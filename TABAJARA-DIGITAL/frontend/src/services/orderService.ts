import type { Order, OrderCreate, PublicTable } from '../types/order'
import { apiGet, apiRequest } from './api'

export function getTables(signal?: AbortSignal): Promise<PublicTable[]> {
  return apiGet<PublicTable[]>('/api/public/mesas', { signal })
}

/** Com o token do Clube, o pedido fica no nome do cliente e vale pontos. */
export function createOrder(data: OrderCreate, customerToken: string | null = null): Promise<Order> {
  return apiRequest<Order>('/api/public/pedidos', {
    method: 'POST',
    body: data,
    token: customerToken,
    scope: 'customer',
  })
}

export function getOrder(code: string, signal?: AbortSignal): Promise<Order> {
  return apiGet<Order>(`/api/public/pedidos/${encodeURIComponent(code)}`, { signal })
}
