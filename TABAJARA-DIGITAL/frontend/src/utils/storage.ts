// Leitura/gravação segura no navegador (não quebra em modo privado).

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // armazenamento indisponível: segue sem salvar
  }
}

export const STORAGE_KEYS = {
  lastOrder: 'tabajara:ultimo-pedido',
  customer: 'tabajara:cliente',
  admin: 'tabajara:admin',
  club: 'tabajara:clube',
  favorites: 'tabajara:favoritos',
} as const

/** Igual a readJSON/writeJSON, mas só dura enquanto a aba estiver aberta (sessionStorage). */
export function readSessionJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeSessionJSON(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) window.sessionStorage.removeItem(key)
    else window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // armazenamento indisponível: segue sem salvar
  }
}
