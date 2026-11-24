import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'

/** Só mostra o conteúdo para administradores logados; senão, vai para o login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { admin, checking } = useAuth()
  const location = useLocation()

  if (checking) {
    return (
      <p style={{ padding: 48, textAlign: 'center', color: 'var(--c-text-muted)' }} aria-busy="true">
        Verificando acesso…
      </p>
    )
  }
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
