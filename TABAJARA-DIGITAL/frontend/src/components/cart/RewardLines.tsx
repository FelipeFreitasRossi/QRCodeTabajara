import { Cake, Gift, Trash2 } from 'lucide-react'

import { useClubCart } from '../../hooks/useClubCart'
import { cx } from '../../utils/dom'
import { Points } from '../ui/Money'
import { ProductImage } from '../ui/ProductImage'
import { QuantityStepper } from '../ui/QuantityStepper'
import styles from './RewardLines.module.css'

/** Resgates com pontos e presente de aniversário, listados junto com os itens do pedido. */
export function RewardLines({ firstNoBorder = false }: { firstNoBorder?: boolean }) {
  const { rewards, setRewardQuantity, removeReward, birthdayGift, setBirthdayGift, birthday, balance, pointsCost } =
    useClubCart()

  return (
    <ul className={cx(styles.list, firstNoBorder && styles.first)}>
      {rewards.map(({ reward, quantity }) => {
        const roomForOneMore = balance !== null && balance - pointsCost >= reward.points_cost
        return (
          <li key={reward.id} className={styles.item}>
            <ProductImage src={reward.image_url} alt="" className={styles.thumb} />
            <div className={styles.info}>
              <div className={styles.topRow}>
                <span className={styles.name}>{reward.name}</span>
                <Points value={-reward.points_cost * quantity} signed className={styles.cost} />
              </div>
              <span className={styles.tag}>
                <Gift size={12} aria-hidden="true" /> Resgate com pontos
              </span>
              <div className={styles.controls}>
                <QuantityStepper
                  size="sm"
                  value={quantity}
                  min={1}
                  max={roomForOneMore ? Math.min(5, quantity + 1) : quantity}
                  onChange={(value) => setRewardQuantity(reward.id, value)}
                  label={reward.name}
                />
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => removeReward(reward.id)}
                  aria-label={`Remover resgate ${reward.name}`}
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </li>
        )
      })}
      {birthdayGift && birthday?.product && (
        <li className={styles.item}>
          <ProductImage src={birthday.product.image_url} alt="" className={styles.thumb} />
          <div className={styles.info}>
            <div className={styles.topRow}>
              <span className={styles.name}>{birthday.product.name}</span>
              <span className={styles.free}>Grátis</span>
            </div>
            <span className={cx(styles.tag, styles.tagBirthday)}>
              <Cake size={12} aria-hidden="true" /> Presente de aniversário
            </span>
            <div className={styles.controls}>
              <span className={styles.qty}>1 unidade</span>
              <button
                type="button"
                className={styles.remove}
                onClick={() => setBirthdayGift(false)}
                aria-label="Tirar o presente de aniversário do pedido"
              >
                <Trash2 size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </li>
      )}
    </ul>
  )
}
