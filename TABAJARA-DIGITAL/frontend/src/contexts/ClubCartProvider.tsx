import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { useCustomer } from '../hooks/useCustomer'
import * as club from '../services/clubService'
import type { BirthdayStatus, Reward } from '../types/club'
import { readSessionJSON, writeSessionJSON } from '../utils/storage'
import { ClubCartContext } from './clubCartContext'
import type { ClubCartContextValue, RewardLine } from './clubCartContext'

const KEY = 'tabajara:carrinho-clube'
const MAX_PER_REWARD = 5

interface Stored {
  customerId: string
  rewards: RewardLine[]
  birthdayGift: boolean
}

/**
 * Resgates com pontos e presente de aniversário do pedido atual.
 * Ficam só nesta visita e pertencem ao cliente logado: se ele sair, somem.
 * O servidor confere saldo, estoque e o direito ao presente no envio.
 */
export function ClubCartProvider({ children }: { children: ReactNode }) {
  const { customer, confirmIdentity } = useCustomer()
  const active = Boolean(customer) && !confirmIdentity
  const customerId = customer?.id ?? null

  const [state, setState] = useState<Stored | null>(() => readSessionJSON<Stored | null>(KEY, null))
  const [birthday, setBirthday] = useState<BirthdayStatus | null>(null)
  const [balance, setBalance] = useState<number | null>(null)

  // Saiu do Clube ou trocou de conta: descarta os resgates da conta anterior.
  const current = state && active && state.customerId === customerId ? state : null
  useEffect(() => {
    if (state && (!active || state.customerId !== customerId)) {
      setState(null)
      writeSessionJSON(KEY, null)
    }
  }, [state, active, customerId])

  const update = useCallback(
    (fn: (s: Stored) => Stored) => {
      if (!customerId) return
      setState((prev) => {
        const base = prev && prev.customerId === customerId ? prev : { customerId, rewards: [], birthdayGift: false }
        const next = fn(base)
        writeSessionJSON(KEY, next)
        return next
      })
    },
    [customerId],
  )

  const refreshBirthday = useCallback(() => {
    if (!active) return setBirthday(null)
    club
      .getBirthday()
      .then(setBirthday)
      .catch(() => setBirthday(null))
  }, [active])

  const refreshBalance = useCallback(() => {
    if (!active) return setBalance(null)
    club
      .getSummary()
      .then((s) => setBalance(s.balance))
      .catch(() => undefined)
  }, [active])

  useEffect(() => {
    refreshBirthday()
    refreshBalance()
  }, [refreshBirthday, refreshBalance, customerId])

  const value = useMemo<ClubCartContextValue>(() => {
    const rewards = current?.rewards ?? []
    return {
      rewards,
      addReward: (reward: Reward) =>
        update((s) => {
          const existing = s.rewards.find((l) => l.reward.id === reward.id)
          return {
            ...s,
            rewards: existing
              ? s.rewards.map((l) =>
                  l === existing ? { reward, quantity: Math.min(MAX_PER_REWARD, l.quantity + 1) } : l,
                )
              : [...s.rewards, { reward, quantity: 1 }],
          }
        }),
      setRewardQuantity: (rewardId, quantity) =>
        update((s) => ({
          ...s,
          rewards: s.rewards
            .map((l) => (l.reward.id === rewardId ? { ...l, quantity: Math.min(MAX_PER_REWARD, quantity) } : l))
            .filter((l) => l.quantity > 0),
        })),
      removeReward: (rewardId) => update((s) => ({ ...s, rewards: s.rewards.filter((l) => l.reward.id !== rewardId) })),
      pointsCost: rewards.reduce((sum, l) => sum + l.reward.points_cost * l.quantity, 0),
      birthdayGift: Boolean(current?.birthdayGift && birthday?.eligible),
      setBirthdayGift: (v) => update((s) => ({ ...s, birthdayGift: v })),
      birthday,
      refreshBirthday,
      balance,
      refreshBalance,
      clearPerks: () => {
        setState(null)
        writeSessionJSON(KEY, null)
      },
      perksCount:
        rewards.reduce((sum, l) => sum + l.quantity, 0) + (current?.birthdayGift && birthday?.eligible ? 1 : 0),
    }
  }, [current, update, birthday, refreshBirthday, balance, refreshBalance])

  return <ClubCartContext.Provider value={value}>{children}</ClubCartContext.Provider>
}
