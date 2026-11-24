import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CirclePlus, Pencil, Search, Star, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { Switch } from '../../components/admin/Switch'
import { Input } from '../../components/ui/FormControls'
import { ProductImage } from '../../components/ui/ProductImage'
import { useAdmin } from '../../hooks/useAdmin'
import { errorMessage } from '../../services/api'
import * as api from '../../services/adminService'
import type { AdminCategory, AdminProduct } from '../../types/admin'
import { cx } from '../../utils/dom'
import { normalizeText } from '../../utils/search'
import styles from './ProductsPage.module.css'
import { Money } from '../../components/ui/Money'

export function ProductsPage() {
  const { notify } = useAdmin()
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [products, setProducts] = useState<AdminProduct[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('todas')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    try {
      const [cats, prods] = await Promise.all([api.listCategories(), api.listProducts()])
      setCategories(cats)
      setProducts(prods)
      setError(null)
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível carregar os produtos.'))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const replace = (updated: AdminProduct) =>
    setProducts((current) => current?.map((p) => (p.id === updated.id ? updated : p)) ?? current)

  const quickPatch = async (product: AdminProduct, data: Partial<Pick<AdminProduct, 'available' | 'featured'>>) => {
    replace({ ...product, ...data }) // resposta imediata na tela
    try {
      replace(await api.patchProduct(product.id, data))
    } catch (err) {
      replace(product)
      notify(errorMessage(err, 'Não foi possível salvar.'))
    }
  }

  const remove = async (product: AdminProduct) => {
    if (!window.confirm(`Excluir "${product.name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await api.deleteProduct(product.id)
      setProducts((current) => current?.filter((p) => p.id !== product.id) ?? current)
      notify('Produto excluído')
    } catch (err) {
      notify(errorMessage(err, 'Não foi possível excluir.'))
    }
  }

  const move = async (product: AdminProduct, list: AdminProduct[], direction: -1 | 1) => {
    const index = list.findIndex((p) => p.id === product.id)
    const target = index + direction
    if (target < 0 || target >= list.length) return
    const reordered = [...list]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    // Atualiza a tela na hora e salva em seguida.
    const positions = new Map(reordered.map((p, i) => [p.id, i]))
    setProducts(
      (current) => current?.map((p) => (positions.has(p.id) ? { ...p, position: positions.get(p.id)! } : p)) ?? current,
    )
    try {
      await api.reorderProducts(
        product.category_id,
        reordered.map((p) => p.id),
      )
    } catch (err) {
      notify(errorMessage(err, 'Não foi possível salvar a nova ordem.'))
      void load()
    }
  }

  const groups = useMemo(() => {
    if (!products) return []
    const q = normalizeText(query)
    return categories
      .filter((category) => filter === 'todas' || category.id === filter)
      .map((category) => ({
        category,
        items: products
          .filter((p) => p.category_id === category.id)
          .filter((p) => !q || normalizeText(p.name).includes(q))
          .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
      }))
      .filter((group) => group.items.length > 0 || (!q && filter !== 'todas'))
  }, [products, categories, filter, query])

  return (
    <div>
      <AdminPageHeader
        title="Produtos"
        subtitle={products ? `${products.length} produtos no cardápio` : 'Carregando…'}
        actions={
          <Link to="/admin/produtos/novo" className={styles.newLink}>
            <CirclePlus size={18} aria-hidden="true" />
            Novo produto
          </Link>
        }
      />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={16} className={styles.searchIcon} aria-hidden="true" />
          <Input
            type="search"
            placeholder="Buscar produto"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar produto"
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filters} role="tablist" aria-label="Filtrar por categoria">
          {[{ id: 'todas', name: 'Todas' }, ...categories].map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={filter === category.id}
              className={cx(styles.filter, filter === category.id && styles.filterActive)}
              onClick={() => setFilter(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {products && categories.length === 0 && (
        <p className={styles.empty}>
          Crie uma categoria primeiro em <Link to="/admin/categorias">Categorias</Link>.
        </p>
      )}

      {groups.map(({ category, items }) => (
        <section key={category.id} className={styles.group} aria-labelledby={`grupo-${category.id}`}>
          <h2 id={`grupo-${category.id}`} className={styles.groupTitle}>
            {category.name}
            <span className={styles.groupCount}>{items.length}</span>
          </h2>
          {items.length === 0 ? (
            <p className={styles.empty}>Nenhum produto nesta categoria.</p>
          ) : (
            <ul className={styles.list}>
              {items.map((product, index) => (
                <li key={product.id} className={cx(styles.row, !product.available && styles.unavailable)}>
                  <ProductImage src={product.image_url} alt="" className={styles.thumb} />
                  <div className={styles.info}>
                    <Link to={`/admin/produtos/${product.id}`} className={styles.name}>
                      {product.name}
                    </Link>
                    <span className={styles.price}>
                      <Money cents={product.price_cents} variant="plain" />
                      {!product.available && <span className={styles.off}> · Indisponível</span>}
                    </span>
                  </div>

                  <div className={styles.controls}>
                    <Switch
                      checked={product.available}
                      onChange={(available) => void quickPatch(product, { available })}
                      label={`${product.name} disponível para pedido`}
                      hideLabel
                    />
                    <button
                      type="button"
                      className={cx(styles.iconButton, product.featured && styles.starOn)}
                      onClick={() => void quickPatch(product, { featured: !product.featured })}
                      aria-pressed={product.featured}
                      aria-label={
                        product.featured ? `Remover ${product.name} dos destaques` : `Destacar ${product.name}`
                      }
                      title="Destaque da Casa"
                    >
                      <Star size={18} strokeWidth={1.75} fill={product.featured ? 'currentColor' : 'none'} />
                    </button>
                    {query === '' && (
                      <span className={styles.order}>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() => void move(product, items, -1)}
                          disabled={index === 0}
                          aria-label={`Mover ${product.name} para cima`}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() => void move(product, items, 1)}
                          disabled={index === items.length - 1}
                          aria-label={`Mover ${product.name} para baixo`}
                        >
                          <ArrowDown size={16} />
                        </button>
                      </span>
                    )}
                    <Link
                      to={`/admin/produtos/${product.id}`}
                      className={styles.iconButton}
                      aria-label={`Editar ${product.name}`}
                    >
                      <Pencil size={16} />
                    </Link>
                    <button
                      type="button"
                      className={cx(styles.iconButton, styles.danger)}
                      onClick={() => void remove(product)}
                      aria-label={`Excluir ${product.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
