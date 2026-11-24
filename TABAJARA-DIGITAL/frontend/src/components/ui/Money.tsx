import { cx } from '../../utils/dom'
import { formatPrice } from '../../utils/format'
import styles from './Money.module.css'

interface MoneyProps {
  cents: number
  className?: string
  /** "sup": centavos menores e elevados (cardápio, destaques) · "plain": tudo na mesma linha (listas). */
  variant?: 'sup' | 'plain'
}

/**
 * Valor em reais com tipografia de cardápio: "R$" pequeno, reais em destaque e
 * centavos menores. Algarismos alinhados e de mesma largura (não "dançam" ao mudar).
 */
export function Money({ cents, className, variant = 'sup' }: MoneyProps) {
  const negative = cents < 0
  const abs = Math.abs(Math.round(cents))
  const reais = Math.floor(abs / 100).toLocaleString('pt-BR')
  const centavos = String(abs % 100).padStart(2, '0')
  return (
    <span className={cx(styles.money, styles[variant], className)}>
      <span className={styles.srOnly}>{formatPrice(cents)}</span>
      <span aria-hidden="true" className={styles.visual}>
        {negative && <span className={styles.sign}>−</span>}
        <span className={styles.cur}>R$</span>
        <span className={styles.int}>{reais}</span>
        <span className={styles.comma}>,</span>
        <span className={styles.dec}>{centavos}</span>
      </span>
    </span>
  )
}

interface PointsProps {
  value: number
  className?: string
  /** Mostra + ou − antes do número. */
  signed?: boolean
  /** Rótulo depois do número ("pts", "pontos"); vazio para nenhum. */
  unit?: string
}

/** Quantidade de pontos com o mesmo estilo numérico dos preços. */
export function Points({ value, className, signed = false, unit = 'pts' }: PointsProps) {
  const sign = signed ? (value > 0 ? '+' : value < 0 ? '−' : '') : value < 0 ? '−' : ''
  const text = Math.abs(Math.round(value)).toLocaleString('pt-BR')
  return (
    <span className={cx(styles.money, styles.points, className)}>
      <span className={styles.int}>
        {sign}
        {text}
      </span>
      {unit && <span className={styles.unit}> {unit}</span>}
    </span>
  )
}
