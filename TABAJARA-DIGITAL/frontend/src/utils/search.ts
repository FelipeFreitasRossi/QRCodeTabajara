import type { Category } from '../types/menu'

/** Remove acentos e padroniza para busca: "Pão" -> "pao". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/**
 * Filtra o cardápio pelo texto digitado. Procura no nome, na descrição e nos
 * ingredientes. Se o texto bater com o nome da categoria, mostra a categoria inteira.
 */
export function filterCategories(categories: Category[], query: string): Category[] {
  const q = normalizeText(query)
  if (!q) return categories

  const terms = q.split(/\s+/)

  return categories
    .map((category) => {
      if (normalizeText(category.name).includes(q)) return category

      const products = category.products.filter((product) => {
        const haystack = normalizeText([product.name, product.description ?? '', ...product.ingredients].join(' '))
        return terms.every((term) => haystack.includes(term))
      })
      return { ...category, products }
    })
    .filter((category) => category.products.length > 0)
}

export function countProducts(categories: Category[]): number {
  return categories.reduce((total, category) => total + category.products.length, 0)
}
