import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'

import { MAX_ITEM_QUANTITY } from '../types/cart'
import type { CartContextValue, CartItem } from '../types/cart'
import type { Product } from '../types/menu'
import { CartContext } from './cartContext'

const STORAGE_KEY = 'tabajara:carrinho'

type Action =
  | { type: 'add'; product: Product; quantity: number }
  | { type: 'set'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' }
  | { type: 'sync'; products: Product[] }

const clamp = (quantity: number) => Math.max(0, Math.min(MAX_ITEM_QUANTITY, Math.floor(quantity)))

function reducer(items: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case 'add': {
      if (!action.product.available) return items
      const existing = items.find((item) => item.product.id === action.product.id)
      if (existing) {
        return items.map((item) =>
          item === existing ? { product: action.product, quantity: clamp(item.quantity + action.quantity) } : item,
        )
      }
      return [...items, { product: action.product, quantity: clamp(action.quantity) }]
    }
    case 'set':
      return items
        .map((item) => (item.product.id === action.productId ? { ...item, quantity: clamp(action.quantity) } : item))
        .filter((item) => item.quantity > 0)
    case 'remove':
      return items.filter((item) => item.product.id !== action.productId)
    case 'clear':
      return []
    case 'sync': {
      const latest = new Map(action.products.map((product) => [product.id, product]))
      const next = items
        .filter((item) => latest.has(item.product.id))
        .map((item) => ({ ...item, product: latest.get(item.product.id)! }))
      const changed = next.length !== items.length || next.some((item, i) => item.product !== items[i].product)
      return changed ? next : items
    }
  }
}

/** Lê o carrinho salvo no aparelho (sobrevive a recarregar a página). */
function loadInitial(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is CartItem =>
        item &&
        typeof item === 'object' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0 &&
        item.product &&
        typeof item.product.id === 'string' &&
        typeof item.product.price_cents === 'number',
    )
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(reducer, undefined, loadInitial)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // modo privado/armazenamento cheio: o carrinho funciona, só não fica salvo
    }
  }, [items])

  const add = useCallback((product: Product, quantity: number) => dispatch({ type: 'add', product, quantity }), [])
  const setQuantity = useCallback(
    (productId: string, quantity: number) => dispatch({ type: 'set', productId, quantity }),
    [],
  )
  const remove = useCallback((productId: string) => dispatch({ type: 'remove', productId }), [])
  const clear = useCallback(() => dispatch({ type: 'clear' }), [])
  const syncWithMenu = useCallback((products: Product[]) => dispatch({ type: 'sync', products }), [])

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalCents = items.reduce(
      (sum, item) => (item.product.available ? sum + item.product.price_cents * item.quantity : sum),
      0,
    )
    const quantityOf = (productId: string) => items.find((item) => item.product.id === productId)?.quantity ?? 0
    return { items, count, totalCents, add, setQuantity, remove, clear, quantityOf, syncWithMenu }
  }, [items, add, setQuantity, remove, clear, syncWithMenu])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
