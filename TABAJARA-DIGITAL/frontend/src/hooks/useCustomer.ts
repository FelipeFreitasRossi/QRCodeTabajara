import { useContext } from 'react'

import { CustomerContext } from '../contexts/customerContext'

export function useCustomer() {
  const value = useContext(CustomerContext)
  if (!value) throw new Error('useCustomer precisa estar dentro de <CustomerProvider>.')
  return value
}
