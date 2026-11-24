import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { X } from 'lucide-react'

import styles from './TagInput.module.css'

interface TagInputProps {
  id: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  max?: number
}

/** Campo de etiquetas: digite e aperte Enter (ou vírgula) para adicionar. */
export function TagInput({ id, values, onChange, placeholder, max = 40 }: TagInputProps) {
  const [draft, setDraft] = useState('')

  const add = (raw: string) => {
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    const existing = new Set(values.map((v) => v.toLowerCase()))
    const next = [...values]
    for (const part of parts) {
      if (!existing.has(part.toLowerCase()) && next.length < max) {
        next.push(part.slice(0, 60))
        existing.add(part.toLowerCase())
      }
    }
    onChange(next)
    setDraft('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add(draft)
    } else if (event.key === 'Backspace' && !draft && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div className={styles.box}>
      {values.map((value) => (
        <span key={value} className={styles.tag}>
          {value}
          <button
            type="button"
            className={styles.remove}
            onClick={() => onChange(values.filter((v) => v !== value))}
            aria-label={`Remover ${value}`}
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </span>
      ))}
      <input
        id={id}
        className={styles.input}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={values.length === 0 ? placeholder : 'Adicionar…'}
        enterKeyHint="enter"
      />
    </div>
  )
}
