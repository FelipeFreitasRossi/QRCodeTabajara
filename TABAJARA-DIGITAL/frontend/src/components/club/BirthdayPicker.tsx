import { useId, useState } from 'react'
import { Cake, CalendarHeart, Check, ChevronDown } from 'lucide-react'

import { cx } from '../../utils/dom'
import { Button } from '../ui/Button'
import { Sheet } from '../ui/Sheet'
import styles from './BirthdayPicker.module.css'

export const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** Dias do mês sem ano: fevereiro aceita 29 (quem nasceu em ano bissexto). */
export function daysInMonth(month: number): number {
  return new Date(2000, month, 0).getDate()
}

export function formatBirthday(day: number, month: number): string {
  return `${String(day).padStart(2, '0')} de ${MONTHS[month - 1]}`
}

interface BirthdayPickerProps {
  /** null enquanto não escolhido. */
  day: number | null
  month: number | null
  onChange: (day: number, month: number) => void
  id?: string
  invalid?: boolean
  disabled?: boolean
  placeholder?: string
}

/** Campo "Aniversário" que abre um pop-up para escolher o mês e o dia. */
export function BirthdayPicker({
  day,
  month,
  onChange,
  id,
  invalid = false,
  disabled = false,
  placeholder = 'Escolha o dia e o mês',
}: BirthdayPickerProps) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const chosen = day !== null && month !== null

  return (
    <>
      <button
        id={id}
        type="button"
        className={cx(styles.trigger, invalid && styles.invalid, chosen && styles.filled)}
        onClick={() => {
          setMounted(true)
          setOpen(true)
        }}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-invalid={invalid || undefined}
      >
        <Cake size={17} className={styles.triggerIcon} aria-hidden="true" />
        <span className={styles.triggerText}>{day !== null && month !== null ? formatBirthday(day, month) : placeholder}</span>
        <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
      </button>

      {mounted && (
        <BirthdaySheet
          open={open}
          initialDay={day}
          initialMonth={month}
          onClose={() => setOpen(false)}
          onExited={() => setMounted(false)}
          onConfirm={(d, m) => {
            onChange(d, m)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

interface BirthdaySheetProps {
  open: boolean
  initialDay: number | null
  initialMonth: number | null
  onClose: () => void
  onExited: () => void
  onConfirm: (day: number, month: number) => void
}

function BirthdaySheet({ open, initialDay, initialMonth, onClose, onExited, onConfirm }: BirthdaySheetProps) {
  const titleId = useId()
  const [month, setMonth] = useState<number | null>(initialMonth)
  const [day, setDay] = useState<number | null>(initialDay)
  const total = month ? daysInMonth(month) : 31
  const ready = day !== null && month !== null

  const pickMonth = (m: number) => {
    setMonth(m)
    // 31 de março → abril: o dia deixa de existir, então pede de novo.
    if (day !== null && day > daysInMonth(m)) setDay(null)
  }

  const footer = (
    <div className={styles.footer}>
      <p className={styles.preview} aria-live="polite">
        {day !== null && month !== null ? (
          <>
            <span className={styles.previewLabel}>Seu aniversário</span>
            <strong key={`${day}-${month}`} className={styles.previewValue}>
              {formatBirthday(day, month)}
            </strong>
          </>
        ) : (
          <span className={styles.previewLabel}>{month ? 'Agora escolha o dia' : 'Escolha o mês'}</span>
        )}
      </p>
      <Button
        variant="primary"
        disabled={!ready}
        icon={<Check size={18} aria-hidden="true" />}
        onClick={() => day !== null && month !== null && onConfirm(day, month)}
      >
        Confirmar
      </Button>
    </div>
  )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onExited={onExited}
      labelledBy={titleId}
      closeLabel="Fechar seleção de aniversário"
      footer={footer}
      className={styles.sheet}
    >
      <div className={styles.body}>
        <span className={styles.badge} aria-hidden="true">
          <CalendarHeart size={22} strokeWidth={1.6} />
        </span>
        <h2 id={titleId} className={styles.title}>
          Quando é seu aniversário?
        </h2>
        <p className={styles.text}>No mês do seu aniversário você ganha um presente do Clube. Não pedimos o ano.</p>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>Mês</legend>
          <div className={styles.months}>
            {MONTHS.map((name, i) => {
              const m = i + 1
              const selected = month === m
              return (
                <button
                  key={name}
                  type="button"
                  className={cx(styles.month, selected && styles.selected)}
                  aria-pressed={selected}
                  aria-label={name}
                  onClick={() => pickMonth(m)}
                >
                  {name.slice(0, 3)}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className={cx(styles.group, !month && styles.waiting)} disabled={!month}>
          <legend className={styles.legend}>Dia</legend>
          <div className={styles.days} key={month ?? 0}>
            {Array.from({ length: total }, (_, i) => {
              const d = i + 1
              const selected = day === d
              return (
                <button
                  key={d}
                  type="button"
                  className={cx(styles.day, selected && styles.selected)}
                  style={{ animationDelay: `${Math.min(i, 30) * 12}ms` }}
                  aria-pressed={selected}
                  aria-label={month ? formatBirthday(d, month) : `Dia ${d}`}
                  onClick={() => setDay(d)}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </fieldset>
      </div>
    </Sheet>
  )
}
