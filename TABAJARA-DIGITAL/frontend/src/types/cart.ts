import type { Product } from './menu'

export interface CartItem {
  /** Cópia dos dados do produto no momento em que foi adicionado (atualizada quando o cardápio recarrega). */
  product: Product
  quantity: number
}

export interface CartContextValue {
  items: CartItem[]
  /** Quantidade total de itens (soma das quantidades). */
  count: number
  /** Total em centavos, considerando só os itens disponíveis. */
  totalCents: number
  add: (product: Product, quantity: number) => void
  setQuantity: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  clear: () => void
  quantityOf: (productId: string) => number
  /** Atualiza preços/disponibilidade com o cardápio mais recente e remove produtos que não existem mais. */
  syncWithMenu: (products: Product[]) => void
}

export const MAX_ITEM_QUANTITY = 20
