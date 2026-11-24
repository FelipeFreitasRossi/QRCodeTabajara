import { useEffect, useState } from 'react'
import { Check, Gift, Lock } from 'lucide-react'

import { useClubCart } from '../../hooks/useClubCart'
import { getRewards } from '../../services/clubService'
import type { Reward } from '../../types/club'
import { cx } from '../../utils/dom'
import { formatPoints } from '../../utils/format'
import { Points } from '../ui/Money'
import { ProductImage } from '../ui/ProductImage'
import { Reveal } from '../ui/Reveal'
import styles from './RewardsCatalog.module.css'

interface RewardsCatalogProps {
  /** Saldo do cliente; null quando não está logado. */
  balance: number | null
  onRedeem?: (reward: Reward) => void
  onLoginRequest?: () => void
}

/** Catálogo de recompensas: o que dá para trocar pelos pontos e quanto falta para cada uma. */
export function RewardsCatalog({ balance, onRedeem, onLoginRequest }: RewardsCatalogProps) {
  const [rewards, setRewards] = useState<Reward[] | null>(null)
  const { rewards: chosen, pointsCost } = useClubCart()

  useEffect(() => {
    const controller = new AbortController()
    getRewards(controller.signal)
      .then(setRewards)
      .catch(() => setRewards([]))
    return () => controller.abort()
  }, [])

  if (rewards === null) return <div className={styles.loading} aria-busy="true" />
  if (rewards.length === 0) {
    return (
      <div className={styles.empty}>
        <Gift size={26} strokeWidth={1.4} aria-hidden="true" />
        <p>Em breve, recompensas para trocar pelos seus pontos.</p>
      </div>
    )
  }

  const left = balance === null ? null : balance - pointsCost

  return (
    <ul className={styles.grid}>
      {rewards.map((reward, i) => {
        const inCart = chosen.find((l) => l.reward.id === reward.id)?.quantity ?? 0
        const can = left !== null && reward.available && left >= reward.points_cost
        const progress = left === null ? 0 : Math.max(0, Math.min(1, left / reward.points_cost))
        return (
          <li key={reward.id}>
            <Reveal delay={Math.min(i, 5) * 70} className={cx(styles.card, can && styles.ready)}>
              <span className={styles.media}>
                <ProductImage src={reward.image_url} alt="" className={styles.image} muted={!reward.available} />
                {inCart > 0 && (
                  <span className={styles.badge}>
                    <Check size={12} strokeWidth={3} aria-hidden="true" /> {inCart} no carrinho
                  </span>
                )}
              </span>
              <div className={styles.body}>
                <h3 className={styles.name}>{reward.name}</h3>
                {reward.description && <p className={styles.desc}>{reward.description}</p>}
                <Points value={reward.points_cost} unit="pontos" className={styles.cost} />

                {!reward.available ? (
                  <span className={styles.note}>Esgotado no momento</span>
                ) : left === null ? (
                  <button type="button" className={styles.secondary} onClick={onLoginRequest}>
                    Entre para resgatar
                  </button>
                ) : can ? (
                  <button type="button" className={styles.primary} onClick={() => onRedeem?.(reward)}>
                    <Gift size={16} aria-hidden="true" /> Resgatar no pedido
                  </button>
                ) : (
                  <div className={styles.progress}>
                    <span className={styles.bar} aria-hidden="true">
                      <span style={{ transform: `scaleX(${progress})` }} />
                    </span>
                    <span className={styles.note}>
                      <Lock size={12} aria-hidden="true" /> Faltam {formatPoints(reward.points_cost - left)} pontos
                    </span>
                  </div>
                )}
              </div>
            </Reveal>
          </li>
        )
      })}
    </ul>
  )
}
