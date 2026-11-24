import { createContext } from 'react'

import type { BirthdayStatus, Reward } from '../types/club'

export interface RewardLine {
  reward: Reward
  quantity: number
}

export interface ClubCartContextValue {
  /** Recompensas trocadas por pontos neste pedido. */
  rewards: RewardLine[]
  addReward: (reward: Reward) => void
  setRewardQuantity: (rewardId: string, quantity: number) => void
  removeReward: (rewardId: string) => void
  /** Total de pontos que os resgates vão usar. */
  pointsCost: number
  /** Presente de aniversário incluído no pedido. */
  birthdayGift: boolean
  setBirthdayGift: (value: boolean) => void
  /** Situação do presente (null sem login ou sem a função). */
  birthday: BirthdayStatus | null
  refreshBirthday: () => void
  /** Saldo atual do cliente (null sem login). */
  balance: number | null
  refreshBalance: () => void
  /** Limpa resgates e presente (depois de enviar o pedido). */
  clearPerks: () => void
  /** Itens do Clube no carrinho (para o contador da sacola). */
  perksCount: number
}

export const ClubCartContext = createContext<ClubCartContextValue | null>(null)
