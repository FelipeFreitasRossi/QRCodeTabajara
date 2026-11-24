// Tipos espelhando as respostas da API pública (backend/app/schemas/public.py).

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price_cents: number
  image_url: string | null
  ingredients: string[]
  allergens: string[]
  featured: boolean
  available: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  /** Foto da seção (aparece no canto, com degradê). */
  image_url?: string | null
  products: Product[]
}

export interface Menu {
  categories: Category[]
}
