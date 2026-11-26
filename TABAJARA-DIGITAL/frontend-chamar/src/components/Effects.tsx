import type { CSSProperties, PointerEvent } from 'react'

import styles from './Effects.module.css'

/** Fundo vivo: brilho dourado que se move devagar e fagulhas subindo (decorativo). */
export function Ambient() {
  return (
    <div className={styles.ambient} aria-hidden="true">
      <span className={styles.glow} />
      <span className={cx2(styles.glow, styles.glowB)} />
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className={styles.spark}
          style={
            {
              '--x': `${(i * 37) % 100}%`,
              '--d': `${7 + ((i * 5) % 6)}s`,
              '--delay': `${-((i * 1.3) % 9)}s`,
              '--drift': `${((i % 5) - 2) * 14}px`,
              '--s': `${2 + (i % 3)}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

/** Título que aparece palavra por palavra. `key` diferente reinicia a animação. */
export function RevealTitle({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ')
  return (
    <h1 className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden="true" className={styles.word} style={{ animationDelay: `${120 + i * 70}ms` }}>
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </h1>
  )
}

/** ✓ desenhado na tela. */
export function DrawnCheck() {
  return (
    <svg className={styles.check} viewBox="0 0 52 52" width="46" height="46" aria-hidden="true">
      <path d="M14 27.5 L22.5 36 L39 18" />
    </svg>
  )
}

const CONFETTI_COLORS = ['#e8c98a', '#c6a15b', '#f5e3b5', '#b8e0a8', '#ffffff']

/** Confetes que explodem do centro do ícone (uma vez). */
export function Confetti() {
  return (
    <span className={styles.confetti} aria-hidden="true">
      {Array.from({ length: 22 }, (_, i) => {
        const angle = (i / 22) * Math.PI * 2 + (i % 3) * 0.2
        const dist = 70 + ((i * 29) % 60)
        return (
          <span
            key={i}
            className={styles.piece}
            style={
              {
                '--tx': `${Math.cos(angle) * dist}px`,
                '--ty': `${Math.sin(angle) * dist - 20}px`,
                '--r': `${(i * 67) % 360}deg`,
                '--c': CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                '--delay': `${(i % 4) * 30}ms`,
                width: i % 2 ? '6px' : '8px',
                height: i % 2 ? '10px' : '6px',
                borderRadius: i % 3 === 0 ? '50%' : '2px',
              } as CSSProperties
            }
          />
        )
      })}
    </span>
  )
}

/** Onda de luz que sai do ponto onde o dedo tocou no botão. */
export function ripple(event: PointerEvent<HTMLElement>) {
  const target = event.currentTarget
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const rect = target.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2.2
  const wave = document.createElement('span')
  wave.className = styles.ripple
  wave.style.width = wave.style.height = `${size}px`
  wave.style.left = `${event.clientX - rect.left - size / 2}px`
  wave.style.top = `${event.clientY - rect.top - size / 2}px`
  target.appendChild(wave)
  wave.addEventListener('animationend', () => wave.remove(), { once: true })
}

/** mm:ss desde o horário informado. */
export function clockSince(iso: string, now: number): string {
  const total = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function cx2(...c: string[]) {
  return c.join(' ')
}
