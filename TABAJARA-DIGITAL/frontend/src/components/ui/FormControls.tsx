import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

import { cx } from '../../utils/dom'
import styles from './FormControls.module.css'

interface FieldProps {
  label: string
  htmlFor: string
  hint?: ReactNode
  error?: string | null
  /** Contador de caracteres (ex.: "12/300"). */
  counter?: string
  children: ReactNode
  className?: string
}

/** Rótulo + campo + dica/erro, com ligação correta para leitores de tela. */
export function Field({ label, htmlFor, hint, error, counter, children, className }: FieldProps) {
  return (
    <div className={cx(styles.field, error && styles.hasError, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={htmlFor} className={styles.label}>
          {label}
        </label>
        {counter && <span className={styles.counter}>{counter}</span>}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-erro`} className={styles.error} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-dica`} className={styles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function Input({
  className,
  ref,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cx(styles.control, className)} {...rest} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(styles.control, styles.select, className)} {...rest}>
      {children}
    </select>
  )
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(styles.control, styles.textarea, className)} {...rest} />
}
