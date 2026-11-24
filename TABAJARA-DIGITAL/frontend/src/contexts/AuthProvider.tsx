import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { setUnauthorizedHandler } from '../services/api'
import * as adminService from '../services/adminService'
import type { AdminUser } from '../types/admin'
import { readJSON, STORAGE_KEYS, writeJSON } from '../utils/storage'
import { AuthContext } from './authContext'
import type { AuthContextValue } from './authContext'

interface StoredSession {
  token: string
  admin: AdminUser
  expiresAt: number
}

function loadSession(): StoredSession | null {
  const session = readJSON<StoredSession | null>(STORAGE_KEYS.admin, null)
  if (!session || typeof session.token !== 'string' || session.expiresAt < Date.now()) return null
  return session
}

/** Sessão do painel administrativo (token salvo no navegador até expirar). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => {
    const stored = loadSession()
    adminService.setAdminToken(stored?.token ?? null)
    return stored
  })
  const [checking, setChecking] = useState(() => session !== null)

  const logout = useCallback(() => {
    adminService.setAdminToken(null)
    writeJSON(STORAGE_KEYS.admin, null)
    setSession(null)
  }, [])

  // Se qualquer chamada do painel responder 401, a sessão acabou.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // Confere a sessão salva com o servidor ao abrir o painel.
  useEffect(() => {
    if (!checking) return
    adminService
      .getMe()
      .then((admin) => setSession((current) => (current ? { ...current, admin } : current)))
      .catch(() => undefined) // 401 já chama logout; erro de rede mantém a sessão
      .finally(() => setChecking(false))
  }, [checking])

  const login = useCallback(async (email: string, password: string) => {
    const result = await adminService.login(email, password)
    const next: StoredSession = {
      token: result.access_token,
      admin: result.admin,
      expiresAt: Date.now() + result.expires_in * 1000,
    }
    adminService.setAdminToken(next.token)
    writeJSON(STORAGE_KEYS.admin, next)
    setSession(next)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ admin: session?.admin ?? null, checking, login, logout }),
    [session, checking, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
