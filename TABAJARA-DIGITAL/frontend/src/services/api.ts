// Cliente HTTP central. Todas as chamadas à API passam por aqui,
// com tempo limite e mensagens de erro amigáveis em português.

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const DEFAULT_TIMEOUT_MS = 15_000

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Objeto (enviado como JSON) ou FormData (upload de arquivo). */
  body?: unknown
  token?: string | null
  signal?: AbortSignal
  timeoutMs?: number
  /** De quem é o token: painel (admin) ou cliente do Clube. Um 401 encerra só aquela sessão. */
  scope?: AuthScope
}

export type AuthScope = 'admin' | 'customer'

/** Chamados quando uma rota protegida responde 401 (a sessão daquele tipo expirou). */
const unauthorizedHandlers: Record<AuthScope, (() => void) | null> = { admin: null, customer: null }
export function setUnauthorizedHandler(handler: (() => void) | null, scope: AuthScope = 'admin') {
  unauthorizedHandlers[scope] = handler
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const forwardAbort = () => controller.abort()
  options.signal?.addEventListener('abort', forwardAbort)

  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: controller.signal,
    })

    if (!response.ok) {
      let message = 'Não foi possível concluir a operação.'
      try {
        const data: unknown = await response.json()
        if (data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string') {
          message = data.detail
        }
      } catch {
        // resposta sem JSON: mantém a mensagem padrão
      }
      if (response.status === 401 && options.token) unauthorizedHandlers[options.scope ?? 'admin']?.()
      throw new ApiError(response.status, message)
    }

    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (options.signal?.aborted) throw error // cancelado por quem chamou
    if (controller.signal.aborted) {
      throw new ApiError(0, 'A conexão demorou demais. Verifique sua internet e tente novamente.')
    }
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet e tente novamente.')
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', forwardAbort)
  }
}

export function apiGet<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
  return apiRequest<T>(path, options)
}

/** Baixa um arquivo protegido (ex.: PNG do QR Code) como Blob. */
export async function apiBlob(path: string, token: string | null): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet e tente novamente.')
  }
  if (!response.ok) {
    if (response.status === 401 && token) unauthorizedHandlers.admin?.()
    throw new ApiError(response.status, 'Não foi possível baixar o arquivo.')
  }
  return response.blob()
}

/** Converte caminhos como "/uploads/produtos/x.webp" na URL completa da API. */
export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^(https?:|blob:|data:)/i.test(path)) return path
  return `${API_URL}${path}`
}

export function errorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  return error instanceof ApiError ? error.message : fallback
}
