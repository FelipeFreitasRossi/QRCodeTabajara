import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Armchair, BellRing, ChevronDown, CircleHelp, Clock3, Loader2, QrCode, ReceiptText, X } from 'lucide-react'

import { Logo } from '../components/Logo'
import { StateMessage } from '../components/StateMessage'
import { brand } from '../config/brand'
import { ApiError, errorMessage } from '../services/api'
import { cancelCall, createCall, getCallPage } from '../services/callService'
import type { CallTarget } from '../services/callService'
import { TableChooser } from '../components/TableChooser'
import { Ambient, Confetti, DrawnCheck, RevealTitle, clockSince, ripple } from '../components/Effects'
import type { CallPage, CallReason } from '../types'
import { cx, formatTable } from '../utils/dom'
import styles from './CallWaiterPage.module.css'

/** Com chamado aberto, consulta a cada poucos segundos para saber quando a equipe atendeu. */
const POLL_OPEN_MS = 4000
const POLL_IDLE_MS = 20000

const OPTIONS: { reason: CallReason; title: string; text: string; icon: ReactNode }[] = [
  {
    reason: 'atendente',
    title: 'Chamar atendente',
    text: 'Alguém da equipe vem até a sua mesa.',
    icon: <BellRing size={26} strokeWidth={1.6} />,
  },
  {
    reason: 'conta',
    title: 'Pedir a conta',
    text: 'Levamos a conta até você.',
    icon: <ReceiptText size={24} strokeWidth={1.6} />,
  },
  {
    reason: 'ajuda',
    title: 'Ajuda com o pedido',
    text: 'Dúvidas sobre pratos ou o pedido.',
    icon: <CircleHelp size={24} strokeWidth={1.6} />,
  },
]

const WAITING_TITLE: Record<CallReason, string> = {
  atendente: 'Atendente a caminho',
  conta: 'A conta está a caminho',
  ajuda: 'Já vamos te ajudar',
}

function elapsed(iso: string, now: number): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'agora mesmo'
  if (minutes === 1) return 'há 1 minuto'
  return `há ${minutes} minutos`
}

/** Mesa escolhida pelo cliente (sem QR): lembrada só nesta aba; o próximo cliente do aparelho escolhe de novo. */
const TABLE_KEY = 'tabajara:chamar-mesa'

function readChosenTable(): number | null {
  try {
    const n = Number(sessionStorage.getItem(TABLE_KEY))
    return Number.isInteger(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function saveChosenTable(n: number) {
  try {
    sessionStorage.setItem(TABLE_KEY, String(n))
  } catch {
    // sem armazenamento: escolhe de novo se recarregar
  }
}

const PICK_HINT: Record<CallReason, string> = {
  atendente: 'e já chamamos o atendente',
  conta: 'e já pedimos a sua conta',
  ajuda: 'e já avisamos a equipe',
}

/**
 * Página "Chamar atendente". Com o QR (/chamar/<código>) já abre com a mesa.
 * Sem o QR, abre direto nos botões e o cliente escolhe a mesa dele (no topo, ou no primeiro toque).
 * Isolada: não tem cardápio, carrinho nem links para o resto do site.
 */
export function CallWaiterPage({ token }: { token: string | null }) {
  const [chosen, setChosen] = useState<number | null>(() => (token ? null : readChosenTable()))
  const [chooserOpen, setChooserOpen] = useState(false)
  const [pending, setPending] = useState<CallReason | null>(null)
  const target: CallTarget | null = token ? { token } : chosen ? { number: chosen } : null
  const targetKey = token ?? (chosen ? `mesa-${chosen}` : '')
  const [state, setState] = useState<CallPage | null>(null)
  const [fatal, setFatal] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<CallReason | 'cancel' | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [cooldown, setCooldown] = useState(0)
  const alive = useRef(true)

  const call = state?.call ?? null
  const isOpen = call?.status === 'aberto'
  const isAttended = call?.status === 'atendido'

  // Vibração curta quando a equipe marca como atendido (só na mudança, não ao abrir a página já atendida).
  const lastStatus = useRef<string | null>(null)
  useEffect(() => {
    const status = call?.status ?? null
    // O navegador só deixa vibrar depois que a pessoa tocou na página.
    const touched = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive
    if (lastStatus.current === 'aberto' && status === 'atendido' && touched) navigator.vibrate?.([30, 60, 30])
    lastStatus.current = status
  }, [call?.status])

  const apply = useCallback((page: CallPage) => {
    if (!alive.current) return
    setState(page)
    setCooldown(page.cooldown_seconds)
  }, [])

  const refresh = useCallback(
    (signal?: AbortSignal) => {
      if (!target) return Promise.resolve()
      return getCallPage(target, signal)
        .then(apply)
        .catch((err) => {
          if (signal?.aborted || !alive.current) return
          if (err instanceof ApiError && (err.status === 404 || err.status === 403)) setFatal(errorMessage(err))
          // falha de rede passageira: tenta de novo no próximo ciclo, sem assustar o cliente
        })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- target muda junto com targetKey
    [targetKey, apply],
  )

  // Primeira carga
  useEffect(() => {
    alive.current = true
    document.title = 'Chamar atendente · Tabajara'
    const controller = new AbortController()
    // Com QR, mostra "Identificando sua mesa…" até carregar. Sem QR, a página já abre nos botões; se o
    // cliente já escolheu a mesa nesta aba, confere em silêncio se há um chamado aberto.
    refresh(controller.signal)
    return () => {
      alive.current = false
      controller.abort()
    }
  }, [refresh])

  // Atualização automática (mais rápida com chamado aberto) e ao voltar para a aba
  useEffect(() => {
    if (!state) return
    const timer = window.setInterval(() => refresh(), isOpen ? POLL_OPEN_MS : POLL_IDLE_MS)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [state, isOpen, refresh])

  // Relógio para "há 2 minutos" e contagem do intervalo entre chamados
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
      setCooldown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const sendTo = async (to: CallTarget, reason: CallReason) => {
    if (busy) return
    setBusy(reason)
    setNotice(null)
    try {
      apply(await createCall(to, reason))
      navigator.vibrate?.(30)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setFatal(errorMessage(err))
      else setNotice(errorMessage(err, 'Não foi possível chamar agora. Tente de novo.'))
    } finally {
      setBusy(null)
    }
  }

  // Sem mesa escolhida: abre a escolha e, ao escolher, já envia o chamado tocado.
  const send = (reason: CallReason) => {
    if (target) return void sendTo(target, reason)
    setPending(reason)
    setChooserOpen(true)
  }

  const chooseTable = (n: number) => {
    setChooserOpen(false)
    saveChosenTable(n)
    if (n !== chosen) {
      setState(null)
      setChosen(n)
    }
    if (pending) void sendTo({ number: n }, pending)
    setPending(null)
  }

  const cancel = async () => {
    if (busy || !target) return
    setBusy('cancel')
    try {
      apply(await cancelCall(target))
    } catch (err) {
      setNotice(errorMessage(err, 'Não foi possível cancelar. Tente de novo.'))
    } finally {
      setBusy(null)
    }
  }

  if (fatal) {
    return (
      <StateMessage icon={<QrCode size={28} strokeWidth={1.5} />} title={token ? 'QR Code não reconhecido' : 'Use o QR Code da mesa'}>
        <p>{fatal}</p>
      </StateMessage>
    )
  }

  if (!state && token) {
    return (
      <main className={styles.loading} aria-busy="true">
        <Logo size="lg" showTagline />
        <span className={styles.loadingText} role="status">
          <Loader2 size={16} className={styles.spin} aria-hidden="true" /> Identificando sua mesa…
        </span>
      </main>
    )
  }

  const table = state?.table ?? (chosen ? { number: chosen, label: null } : null)

  return (
    <main className={styles.page}>
      <Ambient />
      <header className={styles.top}>
        <Logo size="sm" />
        {token ? (
          table && (
            <div className={styles.table}>
              <span className={styles.tableWord}>Mesa</span>
              <span className={styles.tableNumber}>{String(table.number).padStart(2, '0')}</span>
              {table.label && <span className={styles.tableLabel}>{table.label}</span>}
            </div>
          )
        ) : (
          // Sem QR: o cliente escolhe (ou troca) a mesa tocando aqui
          <button
            type="button"
            className={cx(styles.table, styles.tableButton, !table && styles.tableEmpty)}
            onClick={() => setChooserOpen(true)}
            aria-label={table ? `${formatTable(table.number)}. Trocar mesa` : 'Escolha sua mesa'}
          >
            {table ? (
              <>
                <span className={styles.tableWord}>Mesa</span>
                <span key={table.number} className={styles.tableNumber}>
                  {String(table.number).padStart(2, '0')}
                </span>
                {table.label && <span className={styles.tableLabel}>{table.label}</span>}
              </>
            ) : (
              <span className={styles.tableChoose}>
                <Armchair size={16} aria-hidden="true" /> Escolha sua mesa
              </span>
            )}
            <ChevronDown size={14} className={styles.tableChevron} aria-hidden="true" />
          </button>
        )}
      </header>

      {isOpen && call ? (
        <section className={styles.waiting} aria-live="polite">
          <div className={styles.bell} aria-hidden="true">
            <span className={styles.ring} />
            <span className={styles.ring} />
            <span className={styles.bellIcon}>{call.reason === 'conta' ? <ReceiptText size={34} /> : <BellRing size={36} />}</span>
          </div>
          <RevealTitle key={call.reason} text={WAITING_TITLE[call.reason]} className={styles.title} />
          <p className={styles.text}>
            {table ? `A equipe já foi avisada que a ${formatTable(table.number)} chamou` : 'A equipe já foi avisada'}
            <span className={styles.dots} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </p>
          <span className={styles.timer} title={`Chamado feito ${elapsed(call.created_at, now)}`}>
            <Clock3 size={14} aria-hidden="true" /> esperando há {clockSince(call.created_at, now)}
          </span>

          <div className={styles.waitActions}>
            {call.reason !== 'conta' && (
              <button
                type="button"
                className={styles.secondary}
                onPointerDown={ripple}
                onClick={() => send('conta')}
                disabled={Boolean(busy)}
              >
                {busy === 'conta' ? <Loader2 size={18} className={styles.spin} /> : <ReceiptText size={18} />}
                Pedir a conta também
              </button>
            )}
            <button type="button" className={styles.cancel} onClick={cancel} disabled={Boolean(busy)}>
              {busy === 'cancel' ? <Loader2 size={16} className={styles.spin} /> : <X size={16} />}
              Cancelar chamado
            </button>
          </div>
        </section>
      ) : isAttended ? (
        <section className={styles.done} aria-live="polite">
          <span className={styles.doneWrap} aria-hidden="true">
            <Confetti />
            <span className={styles.doneIcon}>
              <DrawnCheck />
            </span>
          </span>
          <RevealTitle text="Atendido" className={styles.title} />
          <p className={styles.text}>Alguém da equipe já foi até a sua mesa. Precisa de mais alguma coisa?</p>
          <Options busy={busy} cooldown={cooldown} onPick={send} compact />
        </section>
      ) : (
        <section className={styles.idle}>
          <RevealTitle text="Como podemos ajudar?" className={styles.title} />
          <p className={styles.text}>
            {token || table ? 'Toque em uma opção e a equipe é avisada na hora.' : 'Escolha sua mesa e toque em uma opção. A equipe é avisada na hora.'}
          </p>
          <Options busy={busy} cooldown={cooldown} onPick={send} />
        </section>
      )}

      <div className={styles.noticeRegion} role="status" aria-live="polite">
        {notice && <p className={styles.notice}>{notice}</p>}
      </div>

      {chooserOpen && (
        <TableChooser
          current={chosen}
          hint={pending ? PICK_HINT[pending] : undefined}
          onPick={chooseTable}
          onClose={() => {
            setChooserOpen(false)
            setPending(null)
          }}
        />
      )}

      <footer className={styles.footer}>
        {brand.name} · {brand.city}
      </footer>
    </main>
  )
}

interface OptionsProps {
  busy: CallReason | 'cancel' | null
  cooldown: number
  onPick: (reason: CallReason) => void
  compact?: boolean
}

function Options({ busy, cooldown, onPick, compact = false }: OptionsProps) {
  const waiting = cooldown > 0
  return (
    <>
      <div className={cx(styles.options, compact && styles.optionsCompact)}>
        {OPTIONS.map((option, index) => (
          <button
            key={option.reason}
            type="button"
            className={cx(styles.option, index === 0 && styles.optionMain)}
            style={{ animationDelay: `${index * 70}ms` }}
            onPointerDown={ripple}
            onClick={() => onPick(option.reason)}
            disabled={Boolean(busy) || waiting}
          >
            <span className={styles.optionIcon} aria-hidden="true">
              {busy === option.reason ? <Loader2 size={24} className={styles.spin} /> : option.icon}
            </span>
            <span className={styles.optionText}>
              <strong>{option.title}</strong>
              {!compact && <span>{option.text}</span>}
            </span>
          </button>
        ))}
      </div>
      {waiting && (
        <p className={styles.cooldown} role="status">
          Você poderá chamar de novo em {cooldown} s.
        </p>
      )}
    </>
  )
}
