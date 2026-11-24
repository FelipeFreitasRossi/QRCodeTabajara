import type { Menu } from '../types/menu'
import { apiGet } from './api'

export function getMenu(signal?: AbortSignal): Promise<Menu> {
  return apiGet<Menu>('/api/public/cardapio', { signal })
}
