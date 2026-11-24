import { useEffect, useState } from 'react'

import { estimatePoints } from '../services/clubService'
import type { CartItem } from '../types/cart'

/** Quantos pontos o carrinho vale — calculado pelo servidor com os preços reais. */
export function usePointsEstimate(items: CartItem[], enabled: boolean): number | null {
  const [points, setPoints] = useState<number | null>(null)
  const signature = items.map((i) => `${i.product.id}:${i.quantity}`).join(',')

  useEffect(() => {
    if (!enabled || items.length === 0) {
      setPoints(null)
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      estimatePoints(
        items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        controller.signal,
      )
        .then((r) => setPoints(r.points))
        .catch(() => undefined)
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
    // a assinatura já representa os itens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, enabled])

  return points
}
