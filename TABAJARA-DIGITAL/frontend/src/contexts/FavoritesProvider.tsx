import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { FavoritesLoginSheet } from '../components/club/FavoritesLoginSheet'
import { useCustomer } from '../hooks/useCustomer'
import * as club from '../services/clubService'
import { STORAGE_KEYS, writeJSON } from '../utils/storage'
import { FavoritesContext } from './favoritesContext'
import type { FavoritesContextValue } from './favoritesContext'

interface Pending {
  id: string
  name: string
}

/**
 * Favoritos ficam na conta do Clube (servidor), não no aparelho:
 * o cliente encontra os mesmos pratos na próxima visita, em qualquer celular.
 * Sem login, o coração convida a entrar e favorita o prato logo depois.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { customer, confirmIdentity } = useCustomer()
  const enabled = Boolean(customer) && !confirmIdentity
  const [ids, setIds] = useState<string[]>([])
  const [pending, setPending] = useState<Pending | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const pendingRef = useRef<Pending | null>(null)
  pendingRef.current = pending

  // versões anteriores guardavam favoritos no aparelho, sem cadastro: descarta
  useEffect(() => writeJSON(STORAGE_KEYS.favorites, null), [])

  // Carrega da conta ao entrar; limpa ao sair (o próximo cliente não vê os favoritos de outro).
  useEffect(() => {
    if (!enabled) {
      setIds([])
      return
    }
    setSheetOpen(false) // entrou (ou confirmou que é ele): fecha o convite
    const controller = new AbortController()
    club
      .getFavorites(controller.signal)
      .then(async (list) => {
        const wanted = pendingRef.current
        if (wanted && !list.includes(wanted.id)) {
          // prato que o cliente tocou antes de entrar
          setIds([wanted.id, ...list])
          setPending(null)
          try {
            setIds(await club.addFavorite(wanted.id))
          } catch {
            setIds(list)
          }
        } else {
          setPending(null)
          setIds(list)
        }
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [enabled, customer?.id])

  const toggle = useCallback(
    (productId: string, productName = 'este prato') => {
      if (!enabled) {
        setPending({ id: productId, name: productName })
        setSheetOpen(true)
        return false
      }
      const adding = !ids.includes(productId)
      const previous = ids
      // otimista: o coração responde na hora; volta atrás se o servidor recusar
      setIds(adding ? [productId, ...ids] : ids.filter((id) => id !== productId))
      ;(adding ? club.addFavorite(productId) : club.removeFavorite(productId))
        .then(setIds)
        .catch(() => setIds(previous))
      return adding
    },
    [enabled, ids],
  )

  const value = useMemo<FavoritesContextValue>(() => {
    const set = new Set(ids)
    return { ids, isFavorite: (id) => set.has(id), toggle, enabled }
  }, [ids, toggle, enabled])

  return (
    <FavoritesContext.Provider value={value}>
      {children}
      {pending && (
        <FavoritesLoginSheet
          open={sheetOpen}
          productName={pending.name}
          onClose={() => setSheetOpen(false)}
          onExited={() => {
            if (!enabled) setPending(null)
          }}
          onDone={() => setSheetOpen(false)}
        />
      )}
    </FavoritesContext.Provider>
  )
}
