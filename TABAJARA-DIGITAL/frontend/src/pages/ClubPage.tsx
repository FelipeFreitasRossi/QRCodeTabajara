import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Crown, Gift, LogOut, Pencil, ReceiptText, ShieldCheck, ShoppingBag, Sparkles, UserRound } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { BirthdayCard } from '../components/club/BirthdayCard'
import { ClubAuthForm } from '../components/club/ClubAuthForm'
import { RewardsCatalog } from '../components/club/RewardsCatalog'
import { Points } from '../components/ui/Money'
import { IdentityConfirm } from '../components/club/IdentityConfirm'
import type { AuthMode } from '../components/club/ClubAuthForm'
import { MemberCard } from '../components/club/MemberCard'
import { PointsBalance } from '../components/club/PointsBalance'
import { TransactionList } from '../components/club/TransactionList'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/FormControls'
import { Reveal } from '../components/ui/Reveal'
import { useClubCart } from '../hooks/useClubCart'
import { useClubRules } from '../hooks/useClubRules'
import { useCustomer } from '../hooks/useCustomer'
import { useScrollFrame } from '../hooks/useScrollFrame'
import { errorMessage } from '../services/api'
import { getSummary, getTransactions } from '../services/clubService'
import type { ClubSummary, ClubTransaction } from '../types/club'
import { cx } from '../utils/dom'
import { formatPoints, maskPhone, onlyDigits } from '../utils/format'
import styles from './ClubPage.module.css'

/** Área do Clube Tabajara: entrar/cadastrar e, logado, cartão, saldo animado e extrato. */
export function ClubPage() {
  const { customer, confirmIdentity } = useCustomer()

  useEffect(() => {
    document.title = 'Clube Tabajara'
  }, [])

  if (customer && confirmIdentity) {
    return (
      <>
        <PageHeader />
        <main className={styles.page}>
          <IdentityConfirm context="club" />
        </main>
      </>
    )
  }

  return (
    <>
      <PageHeader />
      <main className={styles.page}>{customer ? <MemberArea /> : <Welcome />}</main>
    </>
  )
}

// ---------------------------------------------------------------------------
// Visitante: apresentação + entrar/cadastrar
// ---------------------------------------------------------------------------
function Welcome() {
  const rules = useClubRules()
  const { sessionNotice } = useCustomer()
  const [mode, setMode] = useState<AuthMode>('login')
  const perReal = rules?.points_per_real ?? 1
  const [heroRef, setHeroRef] = useState<HTMLElement | null>(null)
  const [params] = useSearchParams()

  // veio do rodapé ("Recompensas"): leva direto ao catálogo
  useEffect(() => {
    if (params.get('aba') !== 'recompensas') return
    const timer = window.setTimeout(
      () => document.getElementById('recompensas')?.scrollIntoView({ behavior: 'smooth' }),
      400,
    )
    return () => window.clearTimeout(timer)
  }, [params])

  // parallax suave do título ao rolar
  useScrollFrame((y) => {
    if (!heroRef) return
    heroRef.style.transform = `translate3d(0, ${y * 0.25}px, 0)`
    heroRef.style.opacity = String(Math.max(0, 1 - y / 420))
  })

  const steps = [
    { icon: ShoppingBag, title: 'Peça pelo cardápio', text: 'Na mesa, pelo QR Code, informando seu CPF.' },
    {
      icon: Sparkles,
      title: `${formatPoints(perReal)} ${perReal === 1 ? 'ponto' : 'pontos'} por real`,
      text: 'Os pontos entram assim que o pedido é entregue.',
    },
    { icon: Gift, title: 'Troque por recompensas', text: 'Pratos da casa e um presente no seu aniversário.' },
  ]

  return (
    <>
      <section ref={setHeroRef} className={styles.hero}>
        <span className={styles.heroCrown} aria-hidden="true">
          <Crown size={30} strokeWidth={1.4} />
        </span>
        <p className={styles.eyebrow}>Programa de fidelidade</p>
        <h1 className={styles.title}>
          Clube <em>Tabajara</em>
        </h1>
        <p className={styles.lead}>Cada pedido vira pontos. Cadastro em um minuto, só com CPF e um PIN.</p>
      </section>

      {rules && !rules.enabled && (
        <p className={styles.paused}>O Clube está pausado no momento. Seus pontos continuam guardados.</p>
      )}

      <ol className={styles.steps}>
        {steps.map(({ icon: Icon, title, text }, i) => (
          <li key={title}>
            <Reveal delay={i * 110} className={styles.step}>
              <span className={styles.stepIcon} aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className={styles.stepNumber} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className={styles.stepTitle}>{title}</h2>
              <p className={styles.stepText}>{text}</p>
            </Reveal>
          </li>
        ))}
      </ol>

      <div id="entrar" className={styles.anchor} />
      <Reveal className={styles.authCard}>
        {sessionNotice && <p className={styles.notice}>{sessionNotice}</p>}
        <ClubAuthForm mode={mode} onModeChange={setMode} onSuccess={() => window.scrollTo({ top: 0 })} />
        <p className={styles.privacy}>
          <ShieldCheck size={14} aria-hidden="true" />
          Seu CPF é guardado de forma protegida e nunca aparece completo. <Link to="/privacidade">Privacidade</Link>
        </p>
      </Reveal>

      <section id="recompensas" className={styles.preview} aria-labelledby="ganhar-titulo">
        <h2 id="ganhar-titulo" className={styles.previewTitle}>
          O que você pode ganhar
        </h2>
        <RewardsCatalog
          balance={null}
          onLoginRequest={() => document.getElementById('entrar')?.scrollIntoView({ behavior: 'smooth' })}
        />
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// Membro: cartão, saldo, extrato e dados
// ---------------------------------------------------------------------------
function MemberArea() {
  const { customer, logout } = useCustomer()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('aba') === 'recompensas' ? 'recompensas' : 'pontos'
  const setTab = (next: 'pontos' | 'recompensas') =>
    setParams(next === 'pontos' ? {} : { aba: next }, { replace: true })
  const { addReward, refreshBalance } = useClubCart()
  const [summary, setSummary] = useState<ClubSummary | null>(null)
  const [transactions, setTransactions] = useState<ClubTransaction[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [balanceVisible, setBalanceVisible] = useState(true)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      refreshBalance()
      try {
        const [s, t] = await Promise.all([getSummary(signal), getTransactions(signal)])
        setSummary(s)
        setTransactions(t)
        setError(null)
      } catch (err) {
        if (!signal?.aborted) setError(errorMessage(err, 'Não foi possível carregar seus pontos.'))
      }
    },
    [refreshBalance],
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    // volta para a aba (ex.: depois do pedido ser entregue): atualiza o saldo
    const onVisible = () => document.visibilityState === 'visible' && void load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      controller.abort()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  if (!customer) return null

  return (
    <>
      {/* barra fixa com o saldo quando o bloco principal sai da tela */}
      {summary && (
        <div className={cx(styles.stickyBalance, !balanceVisible && styles.stickyShown)} aria-hidden={balanceVisible}>
          <Crown size={15} aria-hidden="true" />
          <span>Saldo</span>
          <strong>{formatPoints(summary.balance)} pts</strong>
        </div>
      )}

      <section className={styles.memberHead}>
        <p className={styles.eyebrow}>Clube Tabajara</p>
        <h1 className={styles.hello}>Olá, {customer.name.split(' ')[0]}</h1>
      </section>

      <MemberCard customer={customer} />

      <div className={styles.tabs} role="tablist" aria-label="Área do Clube">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'pontos'}
          className={cx(styles.tab, tab === 'pontos' && styles.tabOn)}
          onClick={() => setTab('pontos')}
        >
          <Sparkles size={16} aria-hidden="true" /> Meus pontos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'recompensas'}
          className={cx(styles.tab, tab === 'recompensas' && styles.tabOn)}
          onClick={() => setTab('recompensas')}
        >
          <Gift size={16} aria-hidden="true" /> Recompensas
        </button>
        <span className={styles.tabIndicator} data-tab={tab} aria-hidden="true" />
      </div>

      {tab === 'recompensas' ? (
        <section className={styles.rewardsTab} aria-label="Recompensas">
          <p className={styles.rewardsLead}>
            Você tem{' '}
            <strong>
              <Points value={summary?.balance ?? 0} unit="pontos" />
            </strong>
            . Escolha uma recompensa e ela vai junto no seu próximo pedido; os pontos só saem quando o pedido for
            enviado.
          </p>
          <RewardsCatalog
            balance={summary?.balance ?? null}
            onRedeem={(reward) => {
              addReward(reward)
              navigate('/carrinho')
            }}
          />
          <BirthdayCard onUse={() => navigate('/carrinho')} />
        </section>
      ) : (
        <>
          {summary ? (
            <PointsBalance summary={summary} onVisibilityChange={setBalanceVisible} />
          ) : (
            <div className={styles.balanceSkeleton} aria-busy="true">
              {error ? (
                <>
                  <p>{error}</p>
                  <Button onClick={() => void load()}>Tentar novamente</Button>
                </>
              ) : (
                <span className={styles.shimmer} />
              )}
            </div>
          )}

          <Reveal className={styles.block}>
            <h2 className={styles.blockTitle}>
              <ReceiptText size={18} aria-hidden="true" /> Extrato
            </h2>
            {transactions ? <TransactionList items={transactions} /> : <span className={styles.shimmerLine} />}
          </Reveal>

          <BirthdayCard onUse={() => navigate('/carrinho')} />

          <Reveal className={styles.block}>
            <ProfileForm />
          </Reveal>
        </>
      )}

      <div className={styles.footerActions}>
        <Link to="/cardapio" className={styles.primaryLink}>
          <ShoppingBag size={18} aria-hidden="true" /> Fazer um pedido
        </Link>
        <button type="button" className={styles.logout} onClick={logout}>
          <LogOut size={16} aria-hidden="true" /> Sair do Clube neste aparelho
        </button>
      </div>
    </>
  )
}

function ProfileForm() {
  const { customer, update } = useCustomer()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(maskPhone(customer?.phone ?? ''))
  const [email, setEmail] = useState(customer?.email ?? '')
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  if (!customer) return null

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setStatus(null)
    const p = onlyDigits(phone)
    if (name.trim().length < 2) return setStatus({ ok: false, text: 'Informe seu nome.' })
    if (p.length < 10 || p.length > 11) return setStatus({ ok: false, text: 'Informe o celular com DDD.' })
    setBusy(true)
    try {
      await update({ name: name.trim(), phone: p, email: email.trim() || null })
      setStatus({ ok: true, text: 'Dados atualizados.' })
      setEditing(false)
    } catch (err) {
      setStatus({ ok: false, text: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className={styles.blockHead}>
        <h2 className={styles.blockTitle}>
          <UserRound size={18} aria-hidden="true" /> Meus dados
        </h2>
        {!editing && (
          <button type="button" className={styles.edit} onClick={() => setEditing(true)}>
            <Pencil size={14} aria-hidden="true" /> Editar
          </button>
        )}
      </div>

      {editing ? (
        <form className={styles.profileForm} onSubmit={save} noValidate>
          <Field label="Nome" htmlFor="perfil-nome">
            <Input id="perfil-nome" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Celular" htmlFor="perfil-cel">
            <Input
              id="perfil-cel"
              value={phone}
              inputMode="tel"
              onChange={(e) => setPhone(maskPhone(e.target.value))}
            />
          </Field>
          <Field label="E-mail (opcional)" htmlFor="perfil-email">
            <Input id="perfil-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className={styles.formActions}>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      ) : (
        <dl className={styles.profile}>
          <div>
            <dt>Nome</dt>
            <dd>{customer.name}</dd>
          </div>
          <div>
            <dt>CPF</dt>
            <dd>{customer.cpf_tail}</dd>
          </div>
          <div>
            <dt>Celular</dt>
            <dd>{maskPhone(customer.phone)}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{customer.email ?? '—'}</dd>
          </div>
        </dl>
      )}
      {status && (
        <p className={status.ok ? styles.ok : styles.fail} role="status">
          {status.text}
        </p>
      )}
      <p className={styles.privacy}>
        <ShieldCheck size={14} aria-hidden="true" />
        Para trocar o CPF ou excluir seu cadastro, fale com a equipe. <Link to="/privacidade">Privacidade</Link>
      </p>
    </>
  )
}
