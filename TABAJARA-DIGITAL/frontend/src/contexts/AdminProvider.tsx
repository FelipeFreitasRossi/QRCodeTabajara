import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { Toast } from '../components/ui/Toast'
import type { ToastMessage } from '../components/ui/Toast'
import { errorMessage } from '../services/api'
import * as adminService from '../services/adminService'
import type { AdminOrder, OrderStatus } from '../types/order'
import { playChime, unlockSound } from '../utils/sound'
import { readJSON, writeJSON } from '../utils/storage'
import { AdminContext } from './adminContext'
import type { AdminContextValue } from './adminContext'

const POLL_MS = 6000
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

  // Mostra a quantidade de pedidos novos no título da aba.
  useEffect(() => {
    const base = 'Painel · Tabajara'
    document.title = pendingCount > 0 ? `(${pendingCount}) ${base}` : base
  }, [pendingCount])

  const setOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
    const updated = await adminService.updateOrderStatus(id, status)
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
    () => ({ orders, ordersError, pendingCount, refreshOrders, setOrderStatus, soundOn, toggleSound, notify }),
    [orders, ordersError, pendingCount, refreshOrders, setOrderStatus, soundOn, toggleSound, notify],
  )

  return (
    <AdminContext.Provider value={value}>
      {children}
      <Toast toast={toast} />
    </AdminContext.Provider>
  )
}
