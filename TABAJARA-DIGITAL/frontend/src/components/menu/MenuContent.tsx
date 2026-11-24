import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useCart } from '../../hooks/useCart'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useScrollSpy } from '../../hooks/useScrollSpy'
import type { Menu, Product } from '../../types/menu'
import { scrollToElement, sectionIdFor } from '../../utils/dom'
import { flyToCart } from '../../utils/flyToCart'
import { countProducts, filterCategories } from '../../utils/search'
import { CartBar } from '../cart/CartBar'
import { CartSheet } from '../cart/CartSheet'
import { Toast } from '../ui/Toast'
import type { ToastMessage } from '../ui/Toast'
import { BackToTop } from '../layout/BackToTop'
import { MenuFooter } from '../layout/MenuFooter'
import { MenuHeader } from '../layout/MenuHeader'
import { CategoryNav } from './CategoryNav'
import { CategorySection } from './CategorySection'
import { EmptySearch } from './EmptySearch'
import { FavoritesRail } from './FavoritesRail'
import { FeaturedRail } from './FeaturedRail'
import { ClubTeaser } from '../club/ClubTeaser'
import { MenuHero } from './MenuHero'
import { ProductSheet } from './ProductSheet'
import { SearchBar } from './SearchBar'
import styles from './MenuContent.module.css'

interface MenuContentProps {
  menu: Menu
}

/** Monta o cardápio completo e coordena busca, navegação, detalhes do produto e carrinho. */
export function MenuContent({ menu }: MenuContentProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 150)
  const isSearching = debouncedQuery.trim().length > 0

  const categories = useMemo(() => filterCategories(menu.categories, debouncedQuery), [menu.categories, debouncedQuery])
  const allProducts = useMemo(() => menu.categories.flatMap((category) => category.products), [menu.categories])
  const featured = useMemo(() => allProducts.filter((product) => product.featured), [allProducts])
  const sectionIds = useMemo(() => categories.map((category) => sectionIdFor(category.slug)), [categories])
  const { activeId, activate } = useScrollSpy(sectionIds)

  // Detalhe do produto: "selected" mantém o painel montado durante a animação de saída.
  const [selected, setSelected] = useState<Product | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const openProduct = useCallback((product: Product) => {
    setSelected(product)
    setSheetOpen(true)
  }, [])
  const closeProduct = useCallback(() => setSheetOpen(false), [])
  const handleSheetExited = useCallback(() => setSelected(null), [])

  // Carrinho
  const { add: addItem, syncWithMenu } = useCart()
  const [cartMounted, setCartMounted] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const openCart = useCallback(() => {
    setCartMounted(true)
    setCartOpen(true)
  }, [])
  const closeCart = useCallback(() => setCartOpen(false), [])
  const handleCartExited = useCallback(() => setCartMounted(false), [])

  const addToCart = useCallback(
    (product: Product, quantity: number, source: HTMLElement | null = null) => {
      void flyToCart(source, quantity) // produto "voa" até a sacola
      addItem(product, quantity)
      setSheetOpen(false)
      setToast({ id: Date.now(), text: `${quantity}× ${product.name} adicionado ao carrinho` })
    },
    [addItem],
  )

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2700)
    return () => window.clearTimeout(timer)
  }, [toast])

  // Mantém preços e disponibilidade do carrinho iguais aos do cardápio atual.
  useEffect(() => {
    syncWithMenu(menu.categories.flatMap((category) => category.products))
  }, [menu, syncWithMenu])

  useBodyScrollLock(selected !== null || cartMounted)

  const searchRef = useRef<HTMLInputElement>(null)
  const menuStartRef = useRef<HTMLDivElement>(null)

  const goToCategory = (slug: string) => {
    const id = sectionIdFor(slug)
    const section = document.getElementById(id)
    if (!section) return
    activate(id)
    scrollToElement(section)
  }

  const focusSearch = () => {
    const input = searchRef.current
    if (!input) return
    input.focus({ preventScroll: true }) // foco imediato: abre o teclado no iPhone
    scrollToElement(input, 24)
  }

  // Atalhos do rodapé: se houver uma busca ativa, limpa antes de ir até a categoria.
  const goToCategoryFromFooter = (slug: string) => {
    if (query) {
      setQuery('')
      window.setTimeout(() => goToCategory(slug), 260)
    } else {
      goToCategory(slug)
    }
  }

  const exploreMenu = () => {
    if (menuStartRef.current) scrollToElement(menuStartRef.current, 0)
  }

  return (
    <>
      <a href="#cardapio" className="skip-link">
        Pular para o cardápio
      </a>

      <MenuHeader onSearch={focusSearch} onCart={openCart} />

      <main>
        <MenuHero onExplore={exploreMenu} />

        <div id="cardapio" ref={menuStartRef} className={styles.container}>
          <div className={styles.search}>
            <SearchBar
              ref={searchRef}
              value={query}
              onChange={setQuery}
              resultCount={isSearching ? countProducts(categories) : null}
            />
          </div>

          {!isSearching && <FavoritesRail products={allProducts} onSelect={openProduct} />}

          {!isSearching && featured.length > 0 && <FeaturedRail products={featured} onSelect={openProduct} />}

          <CategoryNav categories={categories} activeId={activeId} onSelect={goToCategory} />

          {categories.length === 0 ? (
            <EmptySearch query={debouncedQuery} onClear={() => setQuery('')} />
          ) : (
            categories.map((category, index) => (
              <CategorySection
                key={category.id}
                id={sectionIdFor(category.slug)}
                index={index}
                category={category}
                onSelect={openProduct}
              />
            ))
          )}

          {!isSearching && <ClubTeaser />}
        </div>
      </main>

      <MenuFooter categories={menu.categories} onSelectCategory={goToCategoryFromFooter} />
      <BackToTop />
      <CartBar onOpen={openCart} />
      <Toast toast={toast} />

      {selected && (
        <ProductSheet
          key={selected.id}
          product={selected}
          open={sheetOpen}
          onClose={closeProduct}
          onExited={handleSheetExited}
          onAdd={addToCart}
        />
      )}

      {cartMounted && <CartSheet open={cartOpen} onClose={closeCart} onExited={handleCartExited} />}
    </>
  )
}
