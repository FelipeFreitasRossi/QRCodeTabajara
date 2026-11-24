import { Minus, Plus } from 'lucide-react'

import { cx } from '../../utils/dom'
import styles from './QuantityStepper.module.css'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  size?: 'md' | 'sm'
  /** Nome do produto, para os botões serem claros em leitores de tela. */
  label: string
}

export function QuantityStepper({ value, onChange, min = 1, max = 20, size = 'md', label }: QuantityStepperProps) {
  return (
    <div className={cx(styles.stepper, styles[size])} role="group" aria-label={`Quantidade de ${label}`}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`Diminuir quantidade de ${label}`}
      >
        <Minus size={size === 'sm' ? 14 : 16} strokeWidth={2} />
      </button>
      <span className={styles.value} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`Aumentar quantidade de ${label}`}
      >
        <Plus size={size === 'sm' ? 14 : 16} strokeWidth={2} />
      </button>
    </div>
  )
}
