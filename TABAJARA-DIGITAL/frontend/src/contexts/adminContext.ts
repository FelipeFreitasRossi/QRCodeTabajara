import { createContext } from 'react'

import type { AdminCall } from '../types/call'
import type { AdminOrder, OrderStatus } from '../types/order'

export interface AdminContextValue {
  /** Pedidos de hoje + em andamento (null enquanto carrega pela primeira vez). */
  orders: AdminOrder[] | null
  ordersError: string | null
  pendingCount: number
  refreshOrders: () => Promise<void>
  setOrderStatus: (id: string, status: OrderStatus, cancelReason?: string) => Promise<void>
  /** Chamados de mesa (abertos primeiro) e os encerrados nas últimas horas. */
  calls: AdminCall[] | null
  callsError: string | null
  openCallsCount: number
  refreshCalls: () => Promise<void>
  attendCall: (id: string) => Promise<void>
  soundOn: boolean
  toggleSound: () => void
  /** Mostra um aviso rápido no painel. */
  notify: (text: string) => void
}

export const AdminContext = createContext<AdminContextValue | null>(null)
