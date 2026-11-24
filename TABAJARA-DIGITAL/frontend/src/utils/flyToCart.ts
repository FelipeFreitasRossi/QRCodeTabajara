// Animação "voar até o carrinho": uma cópia da foto do produto sai do ponto
// onde o cliente tocou e faz um arco até o ícone da sacola, que "pula" ao receber.
// Tudo com Web Animations API (GPU: só transform e opacity), sem re-render do React.

import { prefersReducedMotion } from './dom'

const TARGET_SELECTOR = '[data-cart-target]'

function visibleTarget(): HTMLElement | null {
  const targets = Array.from(document.querySelectorAll<HTMLElement>(TARGET_SELECTOR))
  return (
    targets.find((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight
    }) ?? null
  )
}

/** Faz o ícone do carrinho "pular" (também usado quando não há animação de voo). */
export function bumpCart(): void {
  const target = visibleTarget()
  if (!target || prefersReducedMotion()) return
  target.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.28) rotate(-8deg)', offset: 0.35 },
      { transform: 'scale(0.92) rotate(4deg)', offset: 0.65 },
      { transform: 'scale(1)' },
    ],
    { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  )
  // anel dourado expandindo a partir do ícone
  const r = target.getBoundingClientRect()
  const ring = document.createElement('span')
  Object.assign(ring.style, {
    position: 'fixed',
    left: `${r.left + r.width / 2 - 22}px`,
    top: `${r.top + r.height / 2 - 22}px`,
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: '2px solid var(--c-gold-bright)',
    pointerEvents: 'none',
    zIndex: '1000',
  })
  document.body.appendChild(ring)
  ring
    .animate(
      [
        { transform: 'scale(0.6)', opacity: 0.9 },
        { transform: 'scale(1.9)', opacity: 0 },
      ],
      { duration: 620, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    )
    .finished.finally(() => ring.remove())
}

/**
 * Lança a cópia de `source` (imagem ou bloco) até o carrinho.
 * Retorna uma Promise que resolve quando chega (ou imediatamente sem animação).
 */
export function flyToCart(source: HTMLElement | null, quantity = 1): Promise<void> {
  const target = visibleTarget()
  if (!source || !target || prefersReducedMotion()) {
    bumpCart()
    return Promise.resolve()
  }

  const from = source.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const size = Math.min(88, Math.max(56, Math.min(from.width, from.height) * 0.42))
  const startX = from.left + from.width / 2 - size / 2
  const startY = from.top + from.height / 2 - size / 2
  const dx = to.left + to.width / 2 - size / 2 - startX
  const dy = to.top + to.height / 2 - size / 2 - startY

  // Dois elementos: o de fora anda no eixo X (ritmo constante) e o de dentro no Y
  // (acelera), o que desenha um arco natural, como algo arremessado.
  const outer = document.createElement('div')
  const mover = document.createElement('div') // eixo Y + escala (leva a foto e o selo juntos)
  const inner = document.createElement('div')
  Object.assign(outer.style, {
    position: 'fixed',
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${size}px`,
    height: `${size}px`,
    zIndex: '1000',
    pointerEvents: 'none',
    willChange: 'transform',
  })
  Object.assign(mover.style, { position: 'relative', width: '100%', height: '100%', willChange: 'transform, opacity' })
  Object.assign(inner.style, {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    overflow: 'hidden',
    boxShadow: '0 0 0 2px var(--c-gold), 0 18px 40px -10px rgba(0,0,0,.8), 0 0 28px rgba(219,189,128,.45)',
    background: 'radial-gradient(circle at 30% 30%, #e8cf98, #9c7a3c)',
    willChange: 'transform, opacity',
  })

  const img = source instanceof HTMLImageElement ? source : source.querySelector('img')
  if (img && img.complete && img.naturalWidth > 0) {
    const copy = img.cloneNode() as HTMLImageElement
    copy.removeAttribute('loading')
    Object.assign(copy.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: '1' })
    inner.appendChild(copy)
  } else {
    inner.textContent = 'T'
    Object.assign(inner.style, {
      display: 'grid',
      placeItems: 'center',
      color: '#17140e',
      font: `600 ${Math.round(size * 0.45)}px var(--font-display)`,
    })
  }

  if (quantity > 1) {
    const badge = document.createElement('span')
    badge.textContent = `${quantity}`
    Object.assign(badge.style, {
      position: 'absolute',
      top: '-4px',
      right: '-4px',
      minWidth: '24px',
      height: '24px',
      padding: '0 6px',
      borderRadius: '999px',
      background: 'var(--c-gold)',
      color: '#17140e',
      font: '800 12px/24px var(--font-body)',
      textAlign: 'center',
      boxShadow: '0 0 0 2px var(--c-bg)',
    })
    mover.appendChild(badge)
  }

  mover.prepend(inner)
  outer.appendChild(mover)
  document.body.appendChild(outer)

  const duration = Math.min(980, Math.max(640, Math.hypot(dx, dy) * 0.9))
  const lift = Math.min(160, Math.abs(dy) * 0.35 + 60) // altura do arco

  // fase 1: "pega" o item (cresce um pouco) · fase 2: voa encolhendo até a sacola
  const outerAnim = outer.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }], {
    duration,
    easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
    fill: 'forwards',
  })
  mover.animate(
    [
      { transform: 'translateY(0) scale(0.6)', opacity: 0 },
      { transform: `translateY(${-lift * 0.25}px) scale(1.12)`, opacity: 1, offset: 0.16 },
      { transform: `translateY(${-lift}px) scale(0.85)`, offset: 0.42 },
      { transform: `translateY(${dy}px) scale(0.22)`, opacity: 0.85 },
    ],
    { duration, easing: 'cubic-bezier(0.33, 0, 0.67, 1)', fill: 'forwards' },
  )

  return outerAnim.finished
    .catch(() => undefined)
    .then(() => {
      outer.remove()
      bumpCart()
    })
}
