import { useEffect, useState } from 'react'

import { cx, prefersReducedMotion } from '../../utils/dom'
import styles from './SlotCounter.module.css'

interface SlotCounterProps {
  value: number
  /** Começa a girar quando true (ex.: quando entra na tela). */
  active?: boolean
  className?: string
  /** Texto lido por leitores de tela, ex.: "pontos". */
  unit?: string
  onSettled?: () => void
  /** Números em degradê dourado (aplicado a cada algarismo, para não vazar da roda). */
  gold?: boolean
}

const STRIP = Array.from({ length: 30 }, (_, i) => i % 10) // 3 voltas de 0 a 9
const BASE_MS = 1150
const STEP_MS = 170

interface ReelProps {
  digit: number
  /** Muda a cada novo giro. */
  spin: number
  order: number
  animate: boolean
  onDone?: () => void
}

/** Uma "roda" do caça-níquel. Gira duas voltas e para no dígito, com leve tranco no final. */
function Reel({ digit, spin, order, animate, onDone }: ReelProps) {
  const [state, setState] = useState({ pos: animate ? 0 : digit, moving: false })

  useEffect(() => {
    if (!animate) {
      setState({ pos: digit, moving: false })
      return
    }
    // próximo quadro: garante que o navegador pinte a posição inicial antes de girar
    const frame = requestAnimationFrame(() => setState({ pos: digit + 20, moving: true }))
    return () => cancelAnimationFrame(frame)
  }, [digit, spin, animate])

  const duration = BASE_MS + order * STEP_MS
  return (
    <span className={styles.window}>
      <span
        className={cx(styles.strip, state.moving && styles.moving)}
        style={{
          transform: `translateY(${-state.pos}em)`,
          transitionDuration: state.moving ? `${duration}ms` : '0ms',
        }}
        onTransitionEnd={(event) => {
          if (event.propertyName !== 'transform' || !state.moving) return
          setState({ pos: digit, moving: false }) // volta à 1ª volta, sem animar (invisível)
          onDone?.()
        }}
      >
        {STRIP.map((n, i) => (
          <span key={i} className={styles.digit}>
            {n}
          </span>
        ))}
      </span>
    </span>
  )
}

/**
 * Contador estilo caça-níquel: cada algarismo é uma roda que gira e para em
 * sequência, da esquerda para a direita. Respeita "reduzir movimento".
 */
export function SlotCounter({
  value,
  active = true,
  className,
  unit = 'pontos',
  onSettled,
  gold = false,
}: SlotCounterProps) {
  const reduced = typeof window !== 'undefined' && prefersReducedMotion()
  const safe = Math.max(0, Math.round(value))
  const [spin, setSpin] = useState(0)

  useEffect(() => {
    if (active) setSpin((n) => n + 1)
  }, [safe, active])

  const text = safe.toLocaleString('pt-BR')
  const totalDigits = text.replace(/\D/g, '').length
  let digitIndex = 0

  if (reduced || !active) {
    return (
      <span className={cx(styles.counter, gold && styles.gold, className)} aria-label={`${text} ${unit}`}>
        <span aria-hidden="true" className={styles.plain}>
          {active || reduced ? text : '0'}
        </span>
      </span>
    )
  }

  return (
    <span className={cx(styles.counter, gold && styles.gold, className)} role="img" aria-label={`${text} ${unit}`}>
      {Array.from(text).map((char, i) => {
        if (!/\d/.test(char)) {
          return (
            <span key={`s${i}`} className={styles.separator} aria-hidden="true">
              {char}
            </span>
          )
        }
        const order = digitIndex++
        const last = order === totalDigits - 1
        return (
          <span key={`d${text.length - i}`} aria-hidden="true">
            <Reel digit={Number(char)} spin={spin} order={order} animate onDone={last ? onSettled : undefined} />
          </span>
        )
      })}
    </span>
  )
}
