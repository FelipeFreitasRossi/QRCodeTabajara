import { createContext } from 'react'

import type { AdminOrder, OrderStatus } from '../types/order'

export interface AdminContextValue {
  /** Pedidos de hoje + em andamento (null enquanto carrega pela primeira vez). */
  orders: AdminOrder[] | null
  ordersError: string | null
  pendingCount: number
  refreshOrders: () => Promise<void>
  setOrderStatus: (id: string, status: OrderStatus) => Promise<void>
  soundOn: boolean
  toggleSound: () => void
  /** Mostra um aviso rápido no painel. */
  notify: (text: string) => void
}

export const AdminContext = createContext<AdminContextValue | null>(null)
