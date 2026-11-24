import { Check } from 'lucide-react'

import styles from './Toast.module.css'

export interface ToastMessage {
  id: number
  text: string
}

interface ToastProps {
  toast: ToastMessage | null
}

/** Aviso rápido de confirmação (ex.: "Adicionado ao carrinho", "Produto salvo"). */
export function Toast({ toast }: ToastProps) {
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={styles.toast}>
          <span className={styles.check} aria-hidden="true">
            <Check size={14} strokeWidth={3} />
          </span>
          {toast.text}
        </div>
      )}
    </div>
  )
}
