// Espelha backend/app/schemas/order.py

export type OrderStatus = 'recebido' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado'

export type OrderItemKind = 'produto' | 'resgate' | 'aniversario'

export interface OrderItem {
  product_id: string | null
  name: string
  unit_price_cents: number
  quantity: number
  subtotal_cents: number
  /** produto pago, resgate com pontos ou presente de aniversário */
  kind: OrderItemKind
  points_cost: number
}

export interface Order {
  code: string
  short_code: string
  table_number: number
  customer_name: string
  notes: string | null
  items: OrderItem[]
  total_cents: number
  status: OrderStatus
  created_at: string
  status_updated_at: string
  /** Pontos do Clube que este pedido vale (0 = pedido sem cadastro). */
  loyalty_points: number
  loyalty_credited: boolean
  /** Pontos trocados por recompensas neste pedido. */
  points_spent: number
  birthday_gift: boolean
}

export interface AdminOrder extends Order {
  id: string
  customer_id: string | null
}

export interface OrderCreate {
  customer_name: string
  table_number: number
  notes: string | null
  items: { product_id: string; quantity: number }[]
  rewards?: { reward_id: string; quantity: number }[]
  birthday_gift?: boolean
}

export interface PublicTable {
  number: number
  label: string | null
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  recebido: 'Recebido',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export const ORDER_FLOW: OrderStatus[] = ['recebido', 'em_preparo', 'pronto', 'entregue']
