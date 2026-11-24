import { useState } from 'react'
import { Heart } from 'lucide-react'

import { useCustomer } from '../../hooks/useCustomer'
import { Sheet } from '../ui/Sheet'
import { ClubAuthForm } from './ClubAuthForm'
import type { AuthMode } from './ClubAuthForm'
import { IdentityConfirm } from './IdentityConfirm'
import styles from './FavoritesLoginSheet.module.css'

interface FavoritesLoginSheetProps {
  open: boolean
  productName: string
  onClose: () => void
  onExited: () => void
  /** Cliente entrou/confirmou: o prato é favoritado em seguida. */
  onDone: () => void
}

/** "Entre no Clube para salvar seus favoritos" — aberto pelo coração sem login. */
export function FavoritesLoginSheet({ open, productName, onClose, onExited, onDone }: FavoritesLoginSheetProps) {
  const { customer, confirmIdentity } = useCustomer()
  const [mode, setMode] = useState<AuthMode>('login')

  return (
    <Sheet open={open} onClose={onClose} onExited={onExited} labelledBy="favoritos-login-titulo">
      <div className={styles.body}>
        <span className={styles.heart} aria-hidden="true">
          <Heart size={24} />
        </span>
        <h2 id="favoritos-login-titulo" className={styles.title}>
          Salve seus favoritos
        </h2>
        <p className={styles.text}>
          Entre no Clube Tabajara para guardar <strong>{productName}</strong> nos seus favoritos. Eles ficam na sua
          conta e aparecem no cardápio na próxima visita.
        </p>

        {customer && confirmIdentity ? (
          <IdentityConfirm context="club" onNotMe={() => setMode('login')} />
        ) : (
          <ClubAuthForm compact mode={mode} onModeChange={setMode} onSuccess={onDone} />
        )}
      </div>
    </Sheet>
  )
}
