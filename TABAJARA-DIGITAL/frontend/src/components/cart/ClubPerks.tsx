import { useEffect, useState } from 'react'
import { Cake, Check, Crown, Gift, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useClubCart } from '../../hooks/useClubCart'
import { getRewards } from '../../services/clubService'
import type { Reward } from '../../types/club'
import { cx } from '../../utils/dom'
import { formatPoints } from '../../utils/format'
import { Points } from '../ui/Money'
import { ProductImage } from '../ui/ProductImage'
import styles from './ClubPerks.module.css'

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/**
 * No carrinho, para o cliente identificado: presente de aniversário e
 * recompensas que ele pode trocar pelos pontos neste pedido.
 */
export function ClubPerks({ firstName }: { firstName: string }) {
  const { birthday, birthdayGift, setBirthdayGift, balance, pointsCost, rewards: chosen, addReward } = useClubCart()
  const [catalog, setCatalog] = useState<Reward[] | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getRewards(controller.signal)
      .then(setCatalog)
      .catch(() => setCatalog([]))
    return () => controller.abort()
  }, [])

  const left = (balance ?? 0) - pointsCost
  const visible = (catalog ?? []).filter((r) => r.available)
  const showBirthday = Boolean(birthday?.enabled && birthday.product)

  if (!showBirthday && visible.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="clube-vantagens">
      <header className={styles.head}>
        <h2 id="clube-vantagens" className={styles.title}>
          <Crown size={17} aria-hidden="true" /> Vantagens do Clube
        </h2>
        {balance !== null && (
          <span className={styles.balance}>
            Disponível <Points value={left} />
          </span>
        )}
      </header>

      {showBirthday && birthday?.product && (
        <div className={cx(styles.birthday, birthday.eligible && styles.birthdayOn)}>
          <span className={styles.cake} aria-hidden="true">
            <Cake size={22} strokeWidth={1.6} />
          </span>
          <div className={styles.birthdayText}>
            {birthday.eligible ? (
              <>
                <strong>Feliz aniversário, {firstName}!</strong>
                <span>
                  Seu presente: <em>{birthday.product.name}</em> por nossa conta.
                </span>
              </>
            ) : birthday.used_this_year ? (
              <>
                <strong>Presente de aniversário já usado</strong>
                <span>Volte no seu próximo aniversário!</span>
              </>
            ) : !birthday.has_date ? (
              <>
                <strong>Ganhe {birthday.product.name} no seu aniversário</strong>
                <span>Informe a data na área do Clube.</span>
              </>
            ) : birthday.available_from ? (
              <>
                <strong>Seu presente de aniversário está a caminho</strong>
                <span>Liberado a partir de {new Date(birthday.available_from).toLocaleDateString('pt-BR')}.</span>
              </>
            ) : (
              <>
                <strong>Presente de aniversário</strong>
                <span>
                  {birthday.product.name} grátis em {birthday.month ? MONTHS[birthday.month - 1] : 'seu mês'}, no mês do
                  seu aniversário.
                </span>
              </>
            )}
          </div>
          {birthday.eligible ? (
            <button
              type="button"
              className={cx(styles.giftButton, birthdayGift && styles.giftOn)}
              onClick={() => setBirthdayGift(!birthdayGift)}
              aria-pressed={birthdayGift}
            >
              {birthdayGift ? (
                <>
                  <Check size={16} strokeWidth={2.5} aria-hidden="true" /> No pedido
                </>
              ) : (
                <>
                  <Gift size={16} aria-hidden="true" /> Adicionar
                </>
              )}
            </button>
          ) : (
            !birthday.has_date && (
              <Link to="/clube#aniversario" className={styles.link}>
                Informar
              </Link>
            )
          )}
        </div>
      )}

      {visible.length > 0 && (
        <>
          <p className={styles.sub}>Troque seus pontos neste pedido</p>
          <ul className={styles.track}>
            {visible.map((reward) => {
              const inCart = chosen.find((l) => l.reward.id === reward.id)?.quantity ?? 0
              const canAfford = left >= reward.points_cost
              const missing = reward.points_cost - left
              const progress = Math.max(0, Math.min(1, left / reward.points_cost))
              return (
                <li key={reward.id} className={styles.reward}>
                  <span className={styles.media}>
                    <ProductImage src={reward.image_url} alt="" className={styles.image} muted={!canAfford} />
                    {inCart > 0 && <span className={styles.inCart}>{inCart}× no pedido</span>}
                  </span>
                  <span className={styles.name}>{reward.name}</span>
                  <Points value={reward.points_cost} className={styles.cost} />
                  {canAfford ? (
                    <button type="button" className={styles.redeem} onClick={() => addReward(reward)}>
                      <Gift size={15} aria-hidden="true" /> Resgatar
                    </button>
                  ) : (
                    <span className={styles.missing}>
                      <span className={styles.bar} aria-hidden="true">
                        <span style={{ transform: `scaleX(${progress})` }} />
                      </span>
                      <span>
                        <Lock size={12} aria-hidden="true" /> Faltam {formatPoints(missing)}
                      </span>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
