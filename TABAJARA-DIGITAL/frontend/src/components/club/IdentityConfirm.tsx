import { UserCheck, UserX } from 'lucide-react'

import { useCustomer } from '../../hooks/useCustomer'
import styles from './IdentityConfirm.module.css'

interface IdentityConfirmProps {
  /** Texto do que acontece se confirmar (muda entre carrinho e área do Clube). */
  context?: 'order' | 'club'
  onNotMe?: () => void
}

/**
 * "Continuar como Marina?" — aparece depois de escanear o QR quando há uma conta
 * do Clube salva no aparelho, para ninguém pedir (ou ver o saldo) na conta de outra pessoa.
 */
export function IdentityConfirm({ context = 'order', onNotMe }: IdentityConfirmProps) {
  const { customer, confirm, logout } = useCustomer()
  if (!customer) return null
  const first = customer.name.trim().split(/\s+/)[0]

  return (
    <section className={styles.card} aria-labelledby="confirmar-identidade">
      <span className={styles.avatar} aria-hidden="true">
        {first.charAt(0).toUpperCase()}
      </span>
      <p className={styles.eyebrow}>Clube Tabajara</p>
      <h2 id="confirmar-identidade" className={styles.title}>
        Continuar como {first}?
      </h2>
      <p className={styles.text}>
        Este aparelho ainda está conectado à conta de <strong>{customer.name}</strong> (CPF {customer.cpf_tail}).{' '}
        {context === 'order'
          ? 'Se for você, os pontos deste pedido vão para essa conta.'
          : 'Se for você, continue para ver seus pontos.'}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={confirm}>
          <UserCheck size={17} aria-hidden="true" /> Sim, sou eu
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            logout()
            onNotMe?.()
          }}
        >
          <UserX size={17} aria-hidden="true" /> Não sou eu
        </button>
      </div>
    </section>
  )
}
