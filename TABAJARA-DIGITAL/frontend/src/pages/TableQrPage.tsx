import { useEffect, useState } from 'react'
import { QrCode } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Logo } from '../components/ui/Logo'
import { StateMessage } from '../components/ui/StateMessage'
import { useCustomer } from '../hooks/useCustomer'
import { errorMessage } from '../services/api'
import { tableByQr } from '../services/clubService'
import { requestIdentityConfirmation } from '../utils/clubSession'
import { formatTable, saveQrTable } from '../utils/tableSession'
import styles from './TableQrPage.module.css'

/**
 * Destino do QR Code impresso em cada mesa (/m/<código>).
 * Identifica a mesa, guarda nesta visita e abre o cardápio.
 */
export function TableQrPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [table, setTable] = useState<number | null>(null)
  const { customer, requestConfirmation } = useCustomer()
  const hasAccount = Boolean(customer)

  useEffect(() => {
    document.title = 'Bem-vindo · Tabajara'
    const controller = new AbortController()
    tableByQr(token, controller.signal)
      .then((t) => {
        saveQrTable({ number: t.number, label: t.label, token })
        // Conta salva neste aparelho: o carrinho pergunta "Continuar como …?" antes de pontuar.
        if (hasAccount) {
          requestIdentityConfirmation()
          requestConfirmation()
        }
        setTable(t.number)
        window.setTimeout(() => navigate('/cardapio', { replace: true }), 900)
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err, 'Não foi possível identificar a mesa.'))
      })
    return () => controller.abort()
    // só ao abrir o QR
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate])

  if (error) {
    return (
      <StateMessage
        icon={<QrCode size={28} strokeWidth={1.5} />}
        title="QR Code não reconhecido"
        action={
          <Link to="/cardapio" className={styles.link}>
            Abrir o cardápio
          </Link>
        }
      >
        <p>{error}</p>
      </StateMessage>
    )
  }

  return (
    <main className={styles.page} aria-busy={table === null}>
      <div className={styles.center}>
        <Logo size="lg" showTagline />
        <div className={styles.badge} data-ready={table !== null}>
          <span className={styles.pulse} aria-hidden="true" />
          <QrCode size={18} aria-hidden="true" />
          <span role="status">{table !== null ? `Bem-vindo à ${formatTable(table)}` : 'Identificando sua mesa…'}</span>
        </div>
      </div>
    </main>
  )
}
