import { useId } from 'react'
import type { Ref } from 'react'
import { Search, X } from 'lucide-react'

import styles from './SearchBar.module.css'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  /** Quantidade de itens encontrados (anunciada para leitores de tela). */
  resultCount: number | null
  ref?: Ref<HTMLInputElement>
}

export function SearchBar({ value, onChange, resultCount, ref }: SearchBarProps) {
  const inputId = useId()

  return (
    <div className={styles.wrapper} role="search">
      <label htmlFor={inputId} className="visually-hidden">
        Pesquisar no cardápio
      </label>
      <Search className={styles.icon} size={18} strokeWidth={1.75} aria-hidden="true" />
      <input
        ref={ref}
        id={inputId}
        className={styles.input}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        maxLength={60}
        placeholder="Buscar no cardápio"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onChange('')
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
      {value && (
        <button type="button" className={styles.clear} onClick={() => onChange('')} aria-label="Limpar pesquisa">
          <X size={16} strokeWidth={2} />
        </button>
      )}
      <span className="visually-hidden" aria-live="polite">
        {resultCount === null ? '' : `${resultCount} ${resultCount === 1 ? 'item encontrado' : 'itens encontrados'}`}
      </span>
    </div>
  )
}
