import { useEffect, useRef, useState } from 'react'
import { Armchair, Check, Loader2, X } from 'lucide-react'

import { errorMessage } from '../services/api'
import { getTables } from '../services/callService'
import type { PublicTable } from '../types'
import { cx } from '../utils/dom'
import styles from './TableChooser.module.css'

interface TableChooserProps {
  current: number | null
  /** Texto do que acontece depois de escolher (ex.: 'e já pedimos a conta'). */
  hint?: string
  onPick: (number: number) => void
  onClose: () => void
}

/** Pop-up com as mesas em grade: o cliente toca na dele. */
export function TableChooser({ current, hint, onPick, onClose }: TableChooserProps) {
  const [tables, setTables] = useState<PublicTable[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<number | null>(current)
  const closeRef = useRef<HTMLButtonElement>(null)
  const done = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    getTables(controller.signal)
      .then(setTables)
      .catch((err) => !controller.signal.aborted && setError(errorMessage(err, 'Não foi possível carregar as mesas.')))
    return () => controller.abort()
  }, [])

  // Esc fecha; o fundo não rola enquanto o pop-up está aberto
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const pick = (n: number) => {
    if (done.current) return
    done.current = true
    setPicked(n)
    window.setTimeout(() => onPick(n), 240) // deixa ver a mesa marcada antes de fechar
  }

  return (
    <div className={styles.root}>
      <button type="button" className={styles.backdrop} aria-label="Fechar" tabIndex={-1} onClick={onClose} />
      <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="escolher-mesa">
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Fechar escolha de mesa">
          <X size={20} />
        </button>
        <span className={styles.badge} aria-hidden="true">
          <Armchair size={22} strokeWidth={1.6} />
        </span>
        <h2 id="escolher-mesa" className={styles.title}>
          Qual é a sua mesa?
        </h2>
        <p className={styles.text}>O número está na placa sobre a mesa{hint ? ` — ${hint}` : ''}.</p>

        {error && <p className={styles.error}>{error}</p>}
        {!tables && !error && (
          <p className={styles.loading}>
            <Loader2 size={16} className={styles.spin} aria-hidden="true" /> Carregando mesas…
          </p>
        )}
        {tables && tables.length === 0 && <p className={styles.error}>Nenhuma mesa cadastrada.</p>}
        {tables && tables.length > 0 && (
          <div className={styles.grid}>
            {tables.map((t, i) => (
              <button
                key={t.number}
                type="button"
                className={cx(styles.table, picked === t.number && styles.picked)}
                style={{ animationDelay: `${Math.min(i, 24) * 18}ms` }}
                aria-pressed={picked === t.number}
                aria-label={`Mesa ${String(t.number).padStart(2, '0')}${t.label ? `, ${t.label}` : ''}`}
                onClick={() => pick(t.number)}
              >
                <span className={styles.word}>Mesa</span>
                <span className={styles.number}>{String(t.number).padStart(2, '0')}</span>
                {t.label && <span className={styles.area}>{t.label}</span>}
                <span className={styles.check} aria-hidden="true">
                  <Check size={12} strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
