import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { isManager } from '../../types/admin'

/**
 * Telas só do gerente (faturamento, cardápio, Clube, equipe). O garçom que abrir o link
 * vai para Chamados. É só conforto: quem bloqueia de verdade é o servidor (erro 403).
 */
export function RequireManager({ children }: { children: ReactNode }) {
  const { admin } = useAuth()
  if (!isManager(admin)) return <Navigate to="/admin/chamados" replace />
  return <>{children}</>
}
