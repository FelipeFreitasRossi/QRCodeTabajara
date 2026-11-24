import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../services/api'
import { getMenu } from '../services/menuService'
import type { Menu } from '../types/menu'

export type MenuState = { status: 'loading' } | { status: 'success'; menu: Menu } | { status: 'error'; message: string }

/**
 * Carrega o cardápio. Quando o cliente volta para a aba (ex.: desbloqueia
 * o celular), recarrega em segundo plano para refletir alterações do painel.
 */
export function useMenu() {
  const [state, setState] = useState<MenuState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let disposed = false
    let controller = new AbortController()

    const load = async (silent: boolean) => {
      controller.abort()
      const current = new AbortController()
      controller = current

      try {
        const menu = await getMenu(current.signal)
        if (!disposed) setState({ status: 'success', menu })
      } catch (error) {
        if (disposed || current.signal.aborted || silent) return
        const message = error instanceof ApiError ? error.message : 'Ocorreu um erro inesperado.'
        setState({ status: 'error', message })
      }
    }

    void load(false)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void load(true)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      disposed = true
      controller.abort()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [reloadKey])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setReloadKey((key) => key + 1)
  }, [])

  return { state, retry }
}
