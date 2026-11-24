import { useContext } from 'react'

import { FavoritesContext } from '../contexts/favoritesContext'

export function useFavorites() {
  const value = useContext(FavoritesContext)
  if (!value) throw new Error('useFavorites precisa estar dentro de <FavoritesProvider>.')
  return value
}
