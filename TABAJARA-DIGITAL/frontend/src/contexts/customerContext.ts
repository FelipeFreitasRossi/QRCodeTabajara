import { createContext } from 'react'

import type { Customer, CustomerRegister, CustomerUpdate } from '../types/club'

export interface CustomerContextValue {
  customer: Customer | null
  token: string | null
  /** true quando o cliente marcou "Manter conectado neste celular". */
  remembered: boolean
  login: (cpf: string, pin: string, remember?: boolean) => Promise<Customer>
  register: (data: CustomerRegister) => Promise<Customer>
  update: (data: CustomerUpdate) => Promise<Customer>
  logout: () => void
  /** Avisa por que a sessão terminou (ex.: expirou), para a tela mostrar. */
  sessionNotice: string | null
  clearNotice: () => void
  /** Depois de escanear o QR com uma conta salva: perguntar "Continuar como …?". */
  confirmIdentity: boolean
  confirm: () => void
  /** Marca que a identidade deve ser confirmada (chamado pela página do QR). */
  requestConfirmation: () => void
}

export const CustomerContext = createContext<CustomerContextValue | null>(null)
