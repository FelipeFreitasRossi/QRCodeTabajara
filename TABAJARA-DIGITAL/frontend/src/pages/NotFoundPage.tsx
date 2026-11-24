import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { StateMessage } from '../components/ui/StateMessage'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <StateMessage
      icon={<Compass size={28} strokeWidth={1.5} />}
      title="Página não encontrada"
      action={
        <Link to="/cardapio" className={styles.link}>
          Ver o cardápio
        </Link>
      }
    >
      <p>O endereço acessado não existe.</p>
    </StateMessage>
  )
}
