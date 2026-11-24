const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatPrice(cents: number): string {
  return currency.format(cents / 100)
}

/** Junta listas em português: ["a", "b", "c"] -> "a, b e c". */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

/** "agora", "há 5 min", "há 2 h" */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `há ${hours} h`
}

/** "129,90" -> 12990. Retorna null se o valor for inválido. */
export function parsePriceToCents(value: string): number | null {
  const cleaned = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
  if (!cleaned) return null
  const number = Number(cleaned)
  if (!Number.isFinite(number) || number < 0) return null
  return Math.round(number * 100)
}

/** 12990 -> "129,90" (para campos de formulário). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export const onlyDigits = (value: string) => value.replace(/\D/g, '')

/** Máscara de CPF enquanto digita: 000.000.000-00 */
export function maskCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

/** Máscara de celular: (16) 99999-9999 */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Mesma regra do servidor (dígitos verificadores). Só para avisar antes de enviar. */
export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  for (const size of [9, 10]) {
    let sum = 0
    for (let i = 0; i < size; i++) sum += Number(d[i]) * (size + 1 - i)
    const check = ((sum * 10) % 11) % 10
    if (check !== Number(d[size])) return false
  }
  return true
}

const points = new Intl.NumberFormat('pt-BR')
export const formatPoints = (n: number) => points.format(n)

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
export const formatDate = (iso: string) => dateFormat.format(new Date(iso)).replace(/\./g, '')

const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
export const formatMonthYear = (iso: string) => {
  const text = monthYear.format(new Date(iso))
  return text.charAt(0).toUpperCase() + text.slice(1)
}
