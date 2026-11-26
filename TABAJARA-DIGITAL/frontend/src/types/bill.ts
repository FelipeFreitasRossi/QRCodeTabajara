import type { OrderStatus } from './order'

export interface BillItem {
  name: string
  quantity: number
  subtotal_cents: number
  kind: 'produto' | 'resgate' | 'aniversario'
}

export interface BillOrder {
  id: string
  short_code: string
  customer_name: string
  status: OrderStatus
  created_at: string
  total_cents: number
  items: BillItem[]
}

export interface BillSummary {
  orders_count: number
  total_cents: number
  names: string[]
  since: string | null
  /** pedidos ainda não entregues */
  unfinished: number
}

export interface TableBill extends BillSummary {
  table_number: number
  orders: BillOrder[]
}

export interface BillClosed {
  table_number: number
  closed_orders: number
  total_cents: number
}
