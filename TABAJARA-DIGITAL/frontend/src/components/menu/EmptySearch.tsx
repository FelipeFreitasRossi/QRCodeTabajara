import { SearchX } from 'lucide-react'

import { Button } from '../ui/Button'
import styles from './EmptySearch.module.css'

interface EmptySearchProps {
  query: string
  onClear: () => void
}

export function EmptySearch({ query, onClear }: EmptySearchProps) {
  return (
    <div className={styles.empty} role="status">
      <SearchX size={32} strokeWidth={1.25} aria-hidden="true" className={styles.icon} />
      <h2 className={styles.title}>Nada encontrado</h2>
      <p className={styles.text}>
        Não encontramos itens para “{query.trim()}”. Tente outro termo ou navegue pelas categorias.
      </p>
      <Button onClick={onClear}>Limpar pesquisa</Button>
    </div>
  )
}
