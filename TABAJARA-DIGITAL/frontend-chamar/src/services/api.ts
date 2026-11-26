// Cliente HTTP do site de chamar atendente: tempo limite e mensagens de erro em português.
// Fala com a MESMA API do cardápio (VITE_API_URL).

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
  method?: 'GET' | 'POST'
  body?: unknown
  signal?: AbortSignal
  timeoutMs?: number
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const forwardAbort = () => controller.abort()
  options.signal?.addEventListener('abort', forwardAbort)

  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: string | undefined
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

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
      throw new ApiError(response.status, message)
    }

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

export function errorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  return error instanceof ApiError ? error.message : fallback
}
