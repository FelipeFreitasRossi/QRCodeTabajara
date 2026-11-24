import { useEffect, useState } from 'react'
import { ChevronRight, Crown, LogOut, Sparkles, UserPlus, X } from 'lucide-react'

import { useClubRules } from '../../hooks/useClubRules'
import { useCountUp } from '../../hooks/useCountUp'
import { useCustomer } from '../../hooks/useCustomer'
import { getSummary } from '../../services/clubService'
import type { Customer } from '../../types/club'
import { cx } from '../../utils/dom'
import { formatPoints } from '../../utils/format'
import { ClubAuthForm } from './ClubAuthForm'
import { IdentityConfirm } from './IdentityConfirm'
import type { AuthMode } from './ClubAuthForm'
import styles from './ClubCheckout.module.css'

type Step = 'ask' | 'form' | 'skipped'

interface ClubCheckoutProps {
  /** Nome digitado no pedido (pré-preenche o cadastro). */
  typedName: string
  onLoggedIn: (customer: Customer) => void
  /** Pontos que o carrinho vale (calculado pela página, pelo servidor). */
  estimate: number | null
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name
}

/** Cartão "Você tem cadastro no Clube Tabajara?" na finalização do pedido. */
export function ClubCheckout({ typedName, onLoggedIn, estimate }: ClubCheckoutProps) {
  const rules = useClubRules()
  const { customer, logout, sessionNotice, clearNotice, confirmIdentity, remembered } = useCustomer()
  const enabled = rules?.enabled ?? false
  const [step, setStep] = useState<Step>('ask')
  const [mode, setMode] = useState<AuthMode>('login')
  const [balance, setBalance] = useState<number | null>(null)
  const [welcome, setWelcome] = useState<AuthMode | null>(null)

  useEffect(() => {
    if (!customer) {
      setBalance(null)
      return
    }
    const controller = new AbortController()
    getSummary(controller.signal)
      .then((s) => setBalance(s.balance))
      .catch(() => undefined)
    return () => controller.abort()
  }, [customer])

  // sessão expirou no meio do caminho: reabre o login
  useEffect(() => {
    if (sessionNotice && !customer) {
      setStep('form')
      setMode('login')
    }
  }, [sessionNotice, customer])

  const animatedEstimate = useCountUp(estimate ?? 0, estimate !== null, 900)

  if (!rules || !enabled) return null

  const pointsBadge = estimate !== null && estimate > 0 && (
    <span className={styles.points} aria-live="polite">
      <Sparkles size={14} aria-hidden="true" />+{formatPoints(animatedEstimate)} pontos
    </span>
  )

  // ---------- Conta salva no aparelho: confirmar antes de pontuar ----------
  if (customer && confirmIdentity) {
    return <IdentityConfirm context="order" onNotMe={() => setStep('ask')} />
  }

  // ---------- Cliente identificado ----------
  if (customer) {
    return (
      <section className={cx(styles.card, styles.member)} aria-label="Clube Tabajara">
        <span className={styles.shine} aria-hidden="true" />
        {welcome && (
          <span className={styles.confetti} aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} style={{ ['--i' as string]: i }} />
            ))}
          </span>
        )}
        <div className={styles.memberHead}>
          <span className={styles.avatar} aria-hidden="true">
            {firstName(customer.name).charAt(0).toUpperCase()}
          </span>
          <div className={styles.memberText}>
            <p className={styles.eyebrow}>
              <Crown size={13} aria-hidden="true" /> Clube Tabajara
            </p>
            <p className={styles.memberName}>
              {welcome === 'register'
                ? `Bem-vindo ao Clube, ${firstName(customer.name)}!`
                : `Olá, ${firstName(customer.name)}`}
            </p>
            <p className={styles.memberMeta}>
              CPF {customer.cpf_tail}
              {balance !== null && <> · Saldo {formatPoints(balance)} pts</>}
            </p>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => {
              logout()
              setWelcome(null)
              setStep('ask')
            }}
            aria-label="Não sou eu, sair do Clube"
            title="Não é você? Sair"
          >
            <LogOut size={17} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.earn}>
          <span>Este pedido vale</span>
          {pointsBadge || <span className={styles.pointsMuted}>calculando…</span>}
        </div>
        <p className={styles.note}>
          Os pontos entram no seu saldo quando o pedido for entregue.{' '}
          {remembered
            ? 'Você está conectado neste celular.'
            : 'Login só desta visita: sai sozinho ao fechar a página ou após 30 min sem uso.'}
        </p>
      </section>
    )
  }

  // ---------- Pulou ----------
  if (step === 'skipped') {
    return (
      <button type="button" className={cx(styles.card, styles.skipped)} onClick={() => setStep('ask')}>
        <Crown size={16} aria-hidden="true" />
        <span>
          Pedido sem pontos.{' '}
          <strong>{estimate ? `Quero ganhar ${formatPoints(estimate)} pontos` : 'Quero participar do Clube'}</strong>
        </span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    )
  }

  return (
    <section className={cx(styles.card, styles.invite)} aria-labelledby="clube-pergunta">
      <span className={styles.shine} aria-hidden="true" />
      <div className={styles.inviteHead}>
        <span className={styles.crown} aria-hidden="true">
          <Crown size={20} strokeWidth={1.75} />
        </span>
        <div>
          <p className={styles.eyebrow}>Clube Tabajara</p>
          <h2 id="clube-pergunta" className={styles.question}>
            Você tem cadastro?
          </h2>
        </div>
        {step === 'form' && (
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => {
              setStep('ask')
              clearNotice()
            }}
            aria-label="Fechar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <p className={styles.lead}>
        {estimate ? (
          <>
            Ganhe {pointsBadge} com este pedido — {formatPoints(rules.points_per_real)}{' '}
            {rules.points_per_real === 1 ? 'ponto' : 'pontos'} a cada R$ 1.
          </>
        ) : (
          <>Acumule pontos a cada pedido e troque por benefícios na casa.</>
        )}
      </p>

      {sessionNotice && step === 'form' && <p className={styles.notice}>{sessionNotice}</p>}

      {step === 'ask' ? (
        <div className={styles.choices}>
          <button
            type="button"
            className={cx(styles.choice, styles.choicePrimary)}
            onClick={() => {
              setMode('login')
              setStep('form')
            }}
          >
            Sim, entrar com CPF
          </button>
          <button
            type="button"
            className={styles.choice}
            onClick={() => {
              setMode('register')
              setStep('form')
            }}
          >
            <UserPlus size={16} aria-hidden="true" /> Não, quero me cadastrar
          </button>
          <button type="button" className={styles.skip} onClick={() => setStep('skipped')}>
            Agora não
          </button>
        </div>
      ) : (
        <div className={styles.formWrap}>
          <ClubAuthForm
            compact
            mode={mode}
            onModeChange={setMode}
            initialName={typedName}
            onSuccess={(c, m) => {
              setWelcome(m)
              onLoggedIn(c)
            }}
          />
        </div>
      )}
    </section>
  )
}
