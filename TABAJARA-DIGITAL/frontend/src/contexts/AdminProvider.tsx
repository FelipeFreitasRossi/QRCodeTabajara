import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { Toast } from '../components/ui/Toast'
import type { ToastMessage } from '../components/ui/Toast'
import { errorMessage } from '../services/api'
import * as adminService from '../services/adminService'
import type { AdminCall } from '../types/call'
import { CALL_REASON_LABEL, callTableName } from '../types/call'
import type { AdminOrder, OrderStatus } from '../types/order'
import { playBell, playChime, unlockSound } from '../utils/sound'
import { readJSON, writeJSON } from '../utils/storage'
import { AdminContext } from './adminContext'
import type { AdminContextValue } from './adminContext'

const POLL_MS = 6000
const CALLS_POLL_MS = 5000
const SOUND_KEY = 'tabajara:admin-som'

/**
 * Estado compartilhado do painel: busca os pedidos a cada poucos segundos (em
 * qualquer tela do painel), toca um aviso sonoro quando chega pedido novo e
 * mostra avisos rápidos.
 */
export function AdminProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [soundOn, setSoundOn] = useState(() => readJSON<boolean>(SOUND_KEY, true))
  const knownIds = useRef<Set<string> | null>(null)
  const [calls, setCalls] = useState<AdminCall[] | null>(null)
  const [callsError, setCallsError] = useState<string | null>(null)
  // id do chamado -> quantas vezes a mesa já tinha tocado (para avisar de novo quando insistir)
  const knownCalls = useRef<Map<string, number> | null>(null)
  const soundRef = useRef(soundOn)

  useEffect(() => {
    soundRef.current = soundOn
  }, [soundOn])

  const notify = useCallback((text: string) => setToast({ id: Date.now() + Math.random(), text }), [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2700)
    return () => window.clearTimeout(timer)
  }, [toast])

  const refreshOrders = useCallback(async () => {
    try {
      const data = await adminService.listOrders()
      const ids = new Set(data.map((order) => order.id))
      if (knownIds.current) {
        const fresh = data.filter((order) => !knownIds.current!.has(order.id) && order.status === 'recebido')
        if (fresh.length > 0) {
          if (soundRef.current) playChime()
          const first = fresh[0]
          notify(
            fresh.length === 1
              ? `Novo pedido · Mesa ${String(first.table_number).padStart(2, '0')}`
              : `${fresh.length} novos pedidos`,
          )
        }
      }
      knownIds.current = ids
      setOrders(data)
      setOrdersError(null)
    } catch (error) {
      setOrdersError(errorMessage(error, 'Não foi possível atualizar os pedidos.'))
    }
  }, [notify])

  const refreshCalls = useCallback(async () => {
    try {
      const data = await adminService.listCalls()
      const open = data.filter((call) => call.status === 'aberto')
      if (knownCalls.current) {
        const fresh = open.filter((call) => {
          const before = knownCalls.current!.get(call.id)
          return before === undefined || call.repeats > before
        })
        if (fresh.length > 0) {
          if (soundRef.current) playBell()
          const first = fresh[0]
          notify(
            fresh.length === 1
              ? `${callTableName(first.table_number)} · ${CALL_REASON_LABEL[first.reason]}`
              : `${fresh.length} mesas chamando`,
          )
        }
      }
      knownCalls.current = new Map(open.map((call) => [call.id, call.repeats]))
      setCalls(data)
      setCallsError(null)
    } catch (error) {
      setCallsError(errorMessage(error, 'Não foi possível atualizar os chamados.'))
    }
  }, [notify])

  useEffect(() => {
    void refreshCalls()
    const timer = window.setInterval(() => void refreshCalls(), CALLS_POLL_MS)
    return () => window.clearInterval(timer)
  }, [refreshCalls])

  const attendCall = useCallback(async (id: string) => {
    const updated = await adminService.attendCall(id)
    setCalls((current) => current?.map((call) => (call.id === id ? updated : call)) ?? current)
    knownCalls.current?.delete(id)
  }, [])

  useEffect(() => {
    void refreshOrders()
    const timer = window.setInterval(() => void refreshOrders(), POLL_MS)
    return () => window.clearInterval(timer)
  }, [refreshOrders])

  // O navegador só libera o som depois de uma interação: destrava no primeiro toque.
  useEffect(() => {
    const unlock = () => unlockSound()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const pendingCount = orders?.filter((order) => order.status === 'recebido').length ?? 0
  const openCallsCount = calls?.filter((call) => call.status === 'aberto').length ?? 0

  // Mostra no título da aba quantos pedidos novos e chamados abertos há.
  useEffect(() => {
    const base = 'Painel · Tabajara'
    const parts = [
      openCallsCount > 0 ? `🔔${openCallsCount}` : '',
      pendingCount > 0 ? `(${pendingCount})` : '',
    ].filter(Boolean)
    document.title = parts.length ? `${parts.join(' ')} ${base}` : base
  }, [pendingCount, openCallsCount])

  const setOrderStatus = useCallback(async (id: string, status: OrderStatus, cancelReason?: string) => {
    const updated = await adminService.updateOrderStatus(id, status, cancelReason)
    setOrders((current) => current?.map((order) => (order.id === id ? updated : order)) ?? current)
  }, [])

  const toggleSound = useCallback(() => {
    unlockSound()
    setSoundOn((current) => {
      writeJSON(SOUND_KEY, !current)
      if (!current) window.setTimeout(playChime, 50) // toca um exemplo ao ativar
      return !current
    })
  }, [])

  const value = useMemo<AdminContextValue>(
    () => ({
      orders,
      ordersError,
      pendingCount,
      refreshOrders,
      setOrderStatus,
      calls,
      callsError,
      openCallsCount,
      refreshCalls,
      attendCall,
      soundOn,
      toggleSound,
      notify,
    }),
    [
      orders,
      ordersError,
      pendingCount,
      refreshOrders,
      setOrderStatus,
      calls,
      callsError,
      openCallsCount,
      refreshCalls,
      attendCall,
      soundOn,
      toggleSound,
      notify,
    ],
  )

  return (
    <AdminContext.Provider value={value}>
      {children}
      <Toast toast={toast} />
    </AdminContext.Provider>
  )
}
