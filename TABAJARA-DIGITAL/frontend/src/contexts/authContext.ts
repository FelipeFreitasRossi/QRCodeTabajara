import { createContext } from 'react'

import type { AdminUser } from '../types/admin'

export interface AuthContextValue {
  admin: AdminUser | null
  /** true enquanto confere se a sessão salva ainda é válida. */
  checking: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
