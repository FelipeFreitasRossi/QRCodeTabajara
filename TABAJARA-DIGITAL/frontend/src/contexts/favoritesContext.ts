import { createContext } from 'react'

export interface FavoritesContextValue {
  ids: string[]
  isFavorite: (productId: string) => boolean
  /**
   * Marca/desmarca. Sem login, abre o pedido de entrada no Clube e devolve false;
   * o prato é favoritado assim que o cliente entrar.
   */
  toggle: (productId: string, productName?: string) => boolean
  /** true quando há cliente identificado (favoritos ficam salvos na conta). */
  enabled: boolean
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(null)
