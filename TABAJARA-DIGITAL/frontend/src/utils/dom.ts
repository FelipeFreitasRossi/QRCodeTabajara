/** Junta classes CSS ignorando valores falsos: cx('a', cond && 'b'). */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Altura ocupada no topo pelo cabeçalho fixo e pela barra de categorias. */
export function getStickyOffset(): number {
  const header = document.querySelector<HTMLElement>('[data-sticky="header"]')
  const nav = document.querySelector<HTMLElement>('[data-sticky="nav"]')
  return (header?.offsetHeight ?? 0) + (nav?.offsetHeight ?? 0)
}

/** Rola a página até um elemento, descontando o cabeçalho fixo. */
export function scrollToElement(element: HTMLElement, extraOffset = 16): void {
  const top = element.getBoundingClientRect().top + window.scrollY - getStickyOffset() - extraOffset
  window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

export function sectionIdFor(categorySlug: string): string {
  return `categoria-${categorySlug}`
}
