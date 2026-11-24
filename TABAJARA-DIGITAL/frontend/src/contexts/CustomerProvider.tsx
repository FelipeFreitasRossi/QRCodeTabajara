import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { setUnauthorizedHandler } from '../services/api'
import * as club from '../services/clubService'
import type { CustomerRegister, CustomerSession, CustomerUpdate } from '../types/club'
import {
  clearIdentityConfirmation,
  INACTIVITY_MS,
  lastActivity,
  loadSession,
  needsIdentityConfirmation,
  saveSession,
  touchActivity,
} from '../utils/clubSession'
import type { StoredSession } from '../utils/clubSession'
import { CustomerContext } from './customerContext'
import type { CustomerContextValue } from './customerContext'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const

/**
 * Sessão do cliente no Clube Tabajara. Guarda apenas o token e os dados de exibição
 * (nome e CPF mascarado) — o CPF completo e o PIN nunca ficam no aparelho.
 * Por padrão vale só para a visita; veja utils/clubSession.ts.
 */
export function CustomerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => {
    const stored = loadSession()
    club.setCustomerToken(stored?.token ?? null)
    return stored
  })
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)
  const [confirmIdentity, setConfirmIdentity] = useState(() => Boolean(session) && needsIdentityConfirmation())

  const store = useCallback((next: StoredSession | null) => {
    club.setCustomerToken(next?.token ?? null)
    saveSession(next)
    setSession(next)
    if (!next) {
      clearIdentityConfirmation()
      setConfirmIdentity(false)
    }
  }, [])

  const logout = useCallback(() => store(null), [store])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      store(null)
      setSessionNotice('Sua sessão do Clube terminou. Entre novamente com CPF e PIN.')
    }, 'customer')
    return () => setUnauthorizedHandler(null, 'customer')
  }, [store])

  // Saída automática: login da visita encerra após 30 min sem uso e no fim do prazo.
  useEffect(() => {
    if (!session) return
    let lastWrite = 0
    const onActivity = () => {
      const now = Date.now()
      if (now - lastWrite > 15_000) {
        lastWrite = now
        touchActivity()
      }
    }
    const check = () => {
      if (session.expiresAt <= Date.now()) {
        store(null)
        setSessionNotice('Sua sessão do Clube terminou. Entre novamente com CPF e PIN.')
      } else if (!session.remember && Date.now() - lastActivity() > INACTIVITY_MS) {
        store(null)
        setSessionNotice('Por segurança, saímos do Clube após 30 minutos sem uso.')
      }
    }
    if (!session.remember) ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(check, 30_000)
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [session, store])

  // Confere a sessão salva com o servidor (cadastro pode ter sido desativado).
  useEffect(() => {
    if (!session) return
    club
      .getMe()
      .then((customer) =>
        setSession((current) => {
          if (!current) return current
          const next = { ...current, customer }
          saveSession(next)
          return next
        }),
      )
      .catch(() => undefined)
    // só na abertura do site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const begin = useCallback(
    (result: CustomerSession, remember: boolean) => {
      store({
        token: result.access_token,
        customer: result.customer,
        expiresAt: Date.now() + result.expires_in * 1000,
        remember,
      })
      setSessionNotice(null)
      clearIdentityConfirmation()
      setConfirmIdentity(false)
      return result.customer
    },
    [store],
  )

  const login = useCallback(
    async (cpf: string, pin: string, remember = false) => begin(await club.login(cpf, pin, remember), remember),
    [begin],
  )
  const register = useCallback(
    async (data: CustomerRegister) => begin(await club.register(data), Boolean(data.remember)),
    [begin],
  )
  const update = useCallback(async (data: CustomerUpdate) => {
    const customer = await club.updateMe(data)
    setSession((current) => {
      if (!current) return current
      const next = { ...current, customer }
      saveSession(next)
      return next
    })
    return customer
  }, [])

  const confirm = useCallback(() => {
    clearIdentityConfirmation()
    setConfirmIdentity(false)
  }, [])

  const value = useMemo<CustomerContextValue>(
    () => ({
      customer: session?.customer ?? null,
      token: session?.token ?? null,
      remembered: session?.remember ?? false,
      login,
      register,
      update,
      logout,
      sessionNotice,
      clearNotice: () => setSessionNotice(null),
      confirmIdentity,
      confirm,
      requestConfirmation: () => setConfirmIdentity(Boolean(session)),
    }),
    [session, login, register, update, logout, sessionNotice, confirmIdentity, confirm],
  )

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}
