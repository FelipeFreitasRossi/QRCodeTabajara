import { useContext } from 'react'

import { AdminContext } from '../contexts/adminContext'

export function useAdmin() {
  const value = useContext(AdminContext)
  if (!value) throw new Error('useAdmin precisa estar dentro de <AdminProvider>.')
  return value
}
