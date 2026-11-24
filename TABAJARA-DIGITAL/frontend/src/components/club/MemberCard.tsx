import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { Crown } from 'lucide-react'

import { useScrollFrame } from '../../hooks/useScrollFrame'
import type { Customer } from '../../types/club'
import { prefersReducedMotion } from '../../utils/dom'
import { formatMonthYear } from '../../utils/format'
import styles from './MemberCard.module.css'

/**
 * Cartão de membro com acabamento metálico: inclina em 3D seguindo o dedo/mouse,
 * o reflexo dourado acompanha a inclinação e o cartão "assenta" ao rolar a página.
 */
export function MemberCard({ customer }: { customer: Customer }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const tilt = useRef({ x: 0, y: 0 })
  const reduced = typeof window !== 'undefined' && prefersReducedMotion()

  const apply = (scrollY = window.scrollY) => {
    const card = cardRef.current
    if (!card || reduced) return
    const scrollTilt = Math.min(14, scrollY * 0.05) // ao rolar, o cartão deita levemente
    const { x, y } = tilt.current
    card.style.transform = `rotateX(${scrollTilt + y * -10}deg) rotateY(${x * 14}deg) translateZ(0)`
    card.style.setProperty('--gx', `${50 + x * 40}%`)
    card.style.setProperty('--gy', `${50 + y * 40}%`)
    if (wrapRef.current) {
      wrapRef.current.style.opacity = String(Math.max(0.35, 1 - scrollY / 700))
    }
  }

  useScrollFrame((scrollY) => apply(scrollY))

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const r = event.currentTarget.getBoundingClientRect()
    tilt.current = {
      x: (event.clientX - r.left) / r.width - 0.5,
      y: (event.clientY - r.top) / r.height - 0.5,
    }
    apply()
  }

  const onLeave = () => {
    tilt.current = { x: 0, y: 0 }
    cardRef.current?.classList.add(styles.settling)
    apply()
    window.setTimeout(() => cardRef.current?.classList.remove(styles.settling), 600)
  }

  const first = customer.name.trim().split(/\s+/)
  const display = first.length > 1 ? `${first[0]} ${first[first.length - 1]}` : first[0]

  return (
    <div ref={wrapRef} className={styles.stage} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div
        ref={cardRef}
        className={styles.card}
        role="img"
        aria-label={`Cartão de membro do Clube Tabajara de ${customer.name}`}
      >
        <span className={styles.foil} aria-hidden="true" />
        <span className={styles.glare} aria-hidden="true" />
        <span className={styles.pattern} aria-hidden="true" />

        <div className={styles.top}>
          <span className={styles.brand}>
            <Crown size={16} strokeWidth={1.75} aria-hidden="true" />
            Clube Tabajara
          </span>
          <span className={styles.tier}>Membro</span>
        </div>

        <span className={styles.chip} aria-hidden="true" />

        <div className={styles.bottom}>
          <div>
            <span className={styles.label}>Titular</span>
            <span className={styles.name}>{display}</span>
          </div>
          <div className={styles.right}>
            <span className={styles.label}>Desde</span>
            <span className={styles.since}>{formatMonthYear(customer.member_since)}</span>
          </div>
        </div>
        <span className={styles.cpf}>CPF {customer.cpf_tail}</span>
      </div>
    </div>
  )
}
