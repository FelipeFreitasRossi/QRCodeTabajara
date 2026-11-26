import { useId, useMemo, useRef, useState } from 'react'
import { Armchair, Check, ChevronDown, QrCode } from 'lucide-react'

import type { PublicTable } from '../../types/order'
import { cx } from '../../utils/dom'
import { formatTable } from '../../utils/tableSession'
import { Sheet } from '../ui/Sheet'
import styles from './TablePicker.module.css'

interface TablePickerProps {
  tables: PublicTable[]
  /** Número escolhido, como texto ('' enquanto não escolhido). */
  value: string
  onChange: (value: string) => void
  id?: string
  invalid?: boolean
}

const NO_AREA = ''
/** Tempo para o cliente ver a mesa marcada antes do pop-up fechar. */
const CLOSE_DELAY_MS = 260

/** Campo "Mesa" que abre um pop-up com as mesas em grade (um toque escolhe). */
export function TablePicker({ tables, value, onChange, id, invalid = false }: TablePickerProps) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const selected = tables.find((t) => String(t.number) === value) ?? null

  return (
    <>
      <button
        id={id}
        type="button"
        className={cx(styles.trigger, invalid && styles.invalid, selected && styles.filled)}
        onClick={() => {
          setMounted(true)
          setOpen(true)
        }}
        aria-haspopup="dialog"
        aria-invalid={invalid || undefined}
      >
        <Armchair size={18} strokeWidth={1.5} className={styles.triggerIcon} aria-hidden="true" />
        <span className={styles.triggerText}>
          {selected ? (
            <>
              <strong>{formatTable(selected.number)}</strong>
              {selected.label && <span className={styles.triggerLabel}>{selected.label}</span>}
            </>
          ) : (
            'Escolha sua mesa'
          )}
        </span>
        <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
      </button>

      {mounted && (
        <TableSheet
          open={open}
          tables={tables}
          value={value}
          onClose={() => setOpen(false)}
          onExited={() => setMounted(false)}
          onPick={(number) => {
            onChange(String(number))
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

interface TableSheetProps {
  open: boolean
  tables: PublicTable[]
  value: string
  onClose: () => void
  onExited: () => void
  onPick: (number: number) => void
}

function TableSheet({ open, tables, value, onClose, onExited, onPick }: TableSheetProps) {
  const titleId = useId()
  const [picked, setPicked] = useState<string>(value)
  const closing = useRef(false)

  // Agrupa por área (nome da mesa no painel, ex.: "Varanda"). Sem nome, ficam juntas em "Salão".
  const groups = useMemo(() => {
    const map = new Map<string, PublicTable[]>()
    for (const table of tables) {
      const area = table.label?.trim() || NO_AREA
      map.set(area, [...(map.get(area) ?? []), table])
    }
    return [...map.entries()].sort(([a], [b]) => (a === NO_AREA ? -1 : b === NO_AREA ? 1 : a.localeCompare(b, 'pt-BR')))
  }, [tables])
  const showAreaTitles = groups.length > 1

  const pick = (number: number) => {
    if (closing.current) return
    closing.current = true
    setPicked(String(number))
    window.setTimeout(() => onPick(number), CLOSE_DELAY_MS)
  }

  let order = 0

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onExited={onExited}
      labelledBy={titleId}
      closeLabel="Fechar escolha de mesa"
      className={styles.sheet}
    >
      <div className={styles.body}>
        <span className={styles.badge} aria-hidden="true">
          <Armchair size={22} strokeWidth={1.6} />
        </span>
        <h2 id={titleId} className={styles.title}>
          Qual é a sua mesa?
        </h2>
        <p className={styles.text}>
          <QrCode size={15} strokeWidth={1.75} aria-hidden="true" />
          <span>O número está na placa sobre a mesa, junto do QR Code.</span>
        </p>

        {groups.map(([area, list]) => (
          <section key={area || 'salao'} className={styles.group} aria-label={area || 'Salão'}>
            {showAreaTitles && <h3 className={styles.area}>{area || 'Salão'}</h3>}
            <div className={styles.grid}>
              {list.map((table) => {
                const isPicked = picked === String(table.number)
                const delay = Math.min(order++, 24) * 18
                return (
                  <button
                    key={table.number}
                    type="button"
                    className={cx(styles.table, isPicked && styles.picked)}
                    style={{ animationDelay: `${delay}ms` }}
                    aria-pressed={isPicked}
                    aria-label={`${formatTable(table.number)}${table.label ? `, ${table.label}` : ''}`}
                    onClick={() => pick(table.number)}
                  >
                    <span className={styles.tableWord}>Mesa</span>
                    <span className={styles.tableNumber}>{String(table.number).padStart(2, '0')}</span>
                    <span className={styles.check} aria-hidden="true">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </Sheet>
  )
}
