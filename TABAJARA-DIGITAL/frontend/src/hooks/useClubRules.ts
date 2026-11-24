import { useEffect, useState } from 'react'

import { getRules } from '../services/clubService'
import type { ClubRules } from '../types/club'

let cache: ClubRules | null = null

/** Regras públicas do Clube (pontos por real etc.), buscadas uma vez por visita. */
export function useClubRules(): ClubRules | null {
  const [rules, setRules] = useState<ClubRules | null>(cache)

  useEffect(() => {
    if (cache) return
    const controller = new AbortController()
    getRules(controller.signal)
      .then((data) => {
        cache = data
        setRules(data)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  return rules
}
