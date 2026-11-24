import { ArrowRight, Crown } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useClubRules } from '../../hooks/useClubRules'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPoints } from '../../utils/format'
import { Reveal } from '../ui/Reveal'
import styles from './ClubTeaser.module.css'

/** Chamada para o Clube no fim do cardápio. */
export function ClubTeaser() {
  const rules = useClubRules()
  const { customer } = useCustomer()
  if (!rules?.enabled) return null

  const perReal = rules.points_per_real
  return (
    <Reveal className={styles.wrap}>
      <Link to="/clube" className={styles.card}>
        <span className={styles.glow} aria-hidden="true" />
        <span className={styles.crown} aria-hidden="true">
          <Crown size={22} strokeWidth={1.6} />
        </span>
        <span className={styles.text}>
          <span className={styles.eyebrow}>Clube Tabajara</span>
          <span className={styles.title}>
            {customer ? `${customer.name.split(' ')[0]}, veja seus pontos` : 'Cada pedido vira pontos'}
          </span>
          <span className={styles.sub}>
            {formatPoints(perReal)} {perReal === 1 ? 'ponto' : 'pontos'} a cada R$ 1 · cadastro com CPF em 1 minuto
          </span>
        </span>
        <span className={styles.arrow} aria-hidden="true">
          <ArrowRight size={18} />
        </span>
      </Link>
    </Reveal>
  )
}
