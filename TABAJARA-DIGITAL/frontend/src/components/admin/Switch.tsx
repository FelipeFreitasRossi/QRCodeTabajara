import { cx } from '../../utils/dom'
import styles from './Switch.module.css'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** Esconde o texto visualmente (continua acessível). */
  hideLabel?: boolean
  disabled?: boolean
}

export function Switch({ checked, onChange, label, hideLabel = false, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(styles.switch, checked && styles.on)}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      <span className={hideLabel ? 'visually-hidden' : styles.label}>{label}</span>
    </button>
  )
}
