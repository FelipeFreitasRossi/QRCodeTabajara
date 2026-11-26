import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, BellRing, Check, ChevronRight, ClipboardList, Info, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { cx } from '../../utils/dom'
import styles from './AdminToasts.module.css'

export type ToastKind = 'success' | 'error' | 'info' | 'call' | 'order'

export interface NotifyOptions {
  kind?: ToastKind
  /** Linha de cima, em destaque (a mensagem vira o detalhe). */
  title?: string
  /** Ao clicar no aviso, abre esta tela do painel. */
  href?: string
  /** Texto do atalho (ex.: "Ver chamados"). */
  action?: string
  /** Quanto tempo fica na tela, em ms. */
  duration?: number
}

export interface AdminToast extends Required<Pick<NotifyOptions, 'kind' | 'duration'>> {
  id: number
  text: string
  title?: string
  href?: string
  action?: string
}

const DURATION: Record<ToastKind, number> = {
  success: 3200,
  info: 4000,
  error: 6000,
  order: 8000,
  call: 10000, // chamado fica mais tempo: alguém precisa ir até a mesa
}

const ICON: Record<ToastKind, ReactNode> = {
  success: <Check size={16} strokeWidth={3} />,
  info: <Info size={16} strokeWidth={2.2} />,
  error: <AlertCircle size={17} strokeWidth={2.2} />,
  order: <ClipboardList size={17} strokeWidth={2} />,
  call: <BellRing size={17} strokeWidth={2} />,
}

const MAX_VISIBLE = 4

/** Monta o aviso: sem `kind`, mensagens de falha viram erro e as demais, sucesso. */
export function makeToast(text: string, options: NotifyOptions = {}): AdminToast {
  const kind = options.kind ?? (/não foi possível|erro|falha/i.test(text) ? 'error' : 'success')
  return {
    id: Date.now() + Math.random(),
    text,
    kind,
    title: options.title,
    href: options.href,
    action: options.action,
    duration: options.duration ?? DURATION[kind],
  }
}

export function keepNewest(list: AdminToast[]): AdminToast[] {
  return list.slice(-MAX_VISIBLE)
}

interface AdminToastsProps {
  toasts: AdminToast[]
  onDismiss: (id: number) => void
}

/** Pilha de avisos do painel (canto superior direito no computador, topo no celular). */
export function AdminToasts({ toasts, onDismiss }: AdminToastsProps) {
  return (
    <div className={styles.region} aria-live="polite">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastCard({ toast, onDismiss }: { toast: AdminToast; onDismiss: (id: number) => void }) {
  const navigate = useNavigate()
  const [paused, setPaused] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const remaining = useRef(toast.duration)
  const startedAt = useRef(Date.now())

  const close = () => {
    if (leaving) return
    setLeaving(true)
    window.setTimeout(() => onDismiss(toast.id), 260)
  }

  // Some sozinho; com o mouse em cima, o tempo pausa
  useEffect(() => {
    if (paused || leaving) return
    startedAt.current = Date.now()
    const timer = window.setTimeout(close, remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current -= Date.now() - startedAt.current
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, leaving])

  const open = () => {
    if (!toast.href) return
    navigate(toast.href)
    close()
  }

  const content = (
    <>
      <span className={styles.icon} aria-hidden="true">
        {ICON[toast.kind]}
      </span>
      <span className={styles.text}>
        {toast.title && <strong className={styles.title}>{toast.title}</strong>}
        <span className={toast.title ? styles.detail : styles.only}>{toast.text}</span>
        {toast.href && (
          <span className={styles.action}>
            {toast.action ?? 'Abrir'} <ChevronRight size={13} aria-hidden="true" />
          </span>
        )}
      </span>
    </>
  )

  return (
    <div
      className={cx(styles.toast, styles[toast.kind], leaving && styles.leaving)}
      role={toast.kind === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {toast.href ? (
        <button type="button" className={styles.body} onClick={open}>
          {content}
        </button>
      ) : (
        <div className={styles.body}>{content}</div>
      )}
      <button type="button" className={styles.close} onClick={close} aria-label="Fechar aviso">
        <X size={14} />
      </button>
      <span
        className={styles.progress}
        style={{ animationDuration: `${toast.duration}ms`, animationPlayState: paused || leaving ? 'paused' : 'running' }}
        aria-hidden="true"
      />
    </div>
  )
}
