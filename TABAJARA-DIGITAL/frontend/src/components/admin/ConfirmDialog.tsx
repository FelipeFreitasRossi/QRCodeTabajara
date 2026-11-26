import { useId } from 'react'
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

import { cx } from '../../utils/dom'
import { Sheet } from '../ui/Sheet'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onExited: () => void
  /** "danger" para ações que desfazem algo (cancelar pedido); "gold" para concluir (fechar conta). */
  tone?: 'danger' | 'gold'
  icon: ReactNode
  eyebrow?: string
  title: string
  description?: ReactNode
  children?: ReactNode
  confirmLabel: string
  confirmIcon?: ReactNode
  cancelLabel?: string
  busy?: boolean
  /** false enquanto falta algo (ex.: escolher o motivo). */
  canConfirm?: boolean
  onConfirm: () => void
  /** Quando preenchido, mostra a tela de sucesso no lugar do conteúdo. */
  success?: ReactNode
}

/**
 * Pop-up de confirmação do painel. No celular sobe de baixo; no computador fica centralizado.
 * Esc e o X fecham sem confirmar (e, se houver outro painel por baixo, só este fecha).
 */
export function ConfirmDialog({
  open,
  onClose,
  onExited,
  tone = 'gold',
  icon,
  eyebrow,
  title,
  description,
  children,
  confirmLabel,
  confirmIcon,
  cancelLabel = 'Voltar',
  busy = false,
  canConfirm = true,
  onConfirm,
  success,
}: ConfirmDialogProps) {
  const titleId = useId()

  const footer = success ? undefined : (
    <div className={styles.actions}>
      <button type="button" className={styles.back} onClick={onClose} disabled={busy}>
        {cancelLabel}
      </button>
      <button
        type="button"
        className={cx(styles.confirm, tone === 'danger' ? styles.confirmDanger : styles.confirmGold)}
        onClick={onConfirm}
        disabled={busy || !canConfirm}
      >
        {busy ? <Loader2 size={18} className={styles.spin} aria-hidden="true" /> : confirmIcon}
        {confirmLabel}
      </button>
    </div>
  )

  return (
    <Sheet
      open={open}
      onClose={busy ? () => undefined : onClose}
      onExited={onExited}
      labelledBy={titleId}
      closeLabel="Fechar sem confirmar"
      footer={footer}
      className={styles.dialog}
    >
      {success ? (
        <div className={styles.success} role="status">
          {success}
        </div>
      ) : (
        <div className={styles.body}>
          <span className={cx(styles.icon, tone === 'danger' ? styles.iconDanger : styles.iconGold)} aria-hidden="true">
            {icon}
          </span>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {description && <div className={styles.description}>{description}</div>}
          {children}
        </div>
      )}
    </Sheet>
  )
}

interface ChoiceChipsProps<T extends string> {
  label: string
  options: { value: T; label: string; icon?: ReactNode }[]
  value: T | null
  onChange: (value: T | null) => void
  /** Permite desmarcar tocando de novo (para escolhas opcionais). */
  allowNone?: boolean
}

/** Botões de escolha única (motivo do cancelamento, forma de pagamento). */
export function ChoiceChips<T extends string>({ label, options, value, onChange, allowNone = false }: ChoiceChipsProps<T>) {
  return (
    <fieldset className={styles.chips}>
      <legend className={styles.chipsLabel}>{label}</legend>
      <div className={styles.chipsRow}>
        {options.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              className={cx(styles.chip, selected && styles.chipOn)}
              aria-pressed={selected}
              onClick={() => onChange(selected && allowNone ? null : option.value)}
            >
              {option.icon && (
                <span className={styles.chipIcon} aria-hidden="true">
                  {option.icon}
                </span>
              )}
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
