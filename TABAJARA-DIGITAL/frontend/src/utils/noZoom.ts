/**
 * Bloqueia o zoom no celular (pinça e toque duplo), para o site parecer um aplicativo.
 *
 * - Android/Chrome: basta o viewport do index.html (maximum-scale=1, user-scalable=no).
 * - iPhone/Safari: ignora essas opções desde o iOS 10, por isso cancelamos o gesto aqui.
 * - Toque duplo: resolvido no CSS com touch-action: manipulation (global.css).
 */
export function blockZoom() {
  if (typeof document === 'undefined') return
  const cancel = (event: Event) => {
    if (event.cancelable) event.preventDefault()
  }
  // Gesto de pinça do Safari.
  document.addEventListener('gesturestart', cancel, { passive: false })
  document.addEventListener('gesturechange', cancel, { passive: false })
  document.addEventListener('gestureend', cancel, { passive: false })
  // Dois dedos na tela: impede o zoom sem atrapalhar a rolagem com um dedo.
  document.addEventListener(
    'touchmove',
    (event: TouchEvent) => {
      const scale = (event as TouchEvent & { scale?: number }).scale
      if (event.touches.length > 1 || (scale !== undefined && scale !== 1)) cancel(event)
    },
    { passive: false },
  )
}
