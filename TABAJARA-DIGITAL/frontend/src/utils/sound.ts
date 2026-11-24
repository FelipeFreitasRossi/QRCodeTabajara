// Aviso sonoro de novo pedido (gerado no navegador, sem arquivo de áudio).
// Os navegadores só liberam som depois de um toque/clique na página.

let audio: AudioContext | null = null

export function unlockSound(): void {
  try {
    if (!audio) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      audio = new Ctor()
    }
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

/** Dois toques suaves, como uma campainha de balcão. */
export function playChime(): void {
  if (!audio || audio.state !== 'running') return
  const now = audio.currentTime
  ;[0, 0.18].forEach((offset, index) => {
    const osc = audio!.createOscillator()
    const gain = audio!.createGain()
    osc.type = 'sine'
    osc.frequency.value = index === 0 ? 880 : 1318.5
    gain.gain.setValueAtTime(0.0001, now + offset)
    gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.9)
    osc.connect(gain).connect(audio!.destination)
    osc.start(now + offset)
    osc.stop(now + offset + 1)
  })
}
