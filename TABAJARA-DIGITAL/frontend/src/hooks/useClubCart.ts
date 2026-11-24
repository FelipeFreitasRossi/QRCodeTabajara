import { useContext } from 'react'

import { ClubCartContext } from '../contexts/clubCartContext'

export function useClubCart() {
  const value = useContext(ClubCartContext)
  if (!value) throw new Error('useClubCart precisa estar dentro de <ClubCartProvider>.')
  return value
}
