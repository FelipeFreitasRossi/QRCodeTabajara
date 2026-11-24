import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDown, ArrowUp, Check, CirclePlus, ImageOff, ImagePlus, Pencil, Trash2, X } from 'lucide-react'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/FormControls'
import { ProductImage } from '../../components/ui/ProductImage'
import { useAdmin } from '../../hooks/useAdmin'
import { errorMessage } from '../../services/api'
import * as api from '../../services/adminService'
import type { AdminCategory } from '../../types/admin'
import styles from './CatalogAdmin.module.css'

export function CategoriesPage() {
  const { notify } = useAdmin()
  const [categories, setCategories] = useState<AdminCategory[] | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; name: string; description: string } | null>(null)

  const load = useCallback(async () => {
    try {
      setCategories(await api.listCategories())
    } catch (err) {
      notify(errorMessage(err, 'Não foi possível carregar as categorias.'))
    }
  }, [notify])

  useEffect(() => {
    void load()
  }, [load])

  const create = async (event: FormEvent) => {
    event.preventDefault()
    if (name.trim().length < 2) {
      setFormError('Informe o nome da categoria.')
      return
    }
    try {
      await api.createCategory({ name: name.trim(), description: description.trim() || null })
      setName('')
      setDescription('')
      setFormError(null)
      notify('Categoria criada')
      void load()
    } catch (err) {
      setFormError(errorMessage(err))
    }
  }

  const saveEdit = async () => {
    if (!editing) return
    try {
      await api.updateCategory(editing.id, {
        name: editing.name.trim(),
        description: editing.description.trim() || null,
      })
      setEditing(null)
      notify('Categoria atualizada')
      void load()
    } catch (err) {
      notify(errorMessage(err))
    }
  }

  const remove = async (category: AdminCategory) => {
    if (!window.confirm(`Excluir a categoria "${category.name}"?`)) return
    try {
      await api.deleteCategory(category.id)
      notify('Categoria excluída')
      void load()
    } catch (err) {
      notify(errorMessage(err))
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    if (!categories) return
    const target = index + direction
    if (target < 0 || target >= categories.length) return
    const next = [...categories]
    ;[next[index], next[target]] = [next[target], next[index]]
    setCategories(next)
    try {
      setCategories(await api.reorderCategories(next.map((c) => c.id)))
    } catch (err) {
      notify(errorMessage(err, 'Não foi possível salvar a ordem.'))
      void load()
    }
  }

  return (
    <div>
      <AdminPageHeader title="Categorias" subtitle="A ordem aqui é a ordem em que aparecem no cardápio." />

      <form className={styles.addCard} onSubmit={create} noValidate>
        <Field label="Nova categoria" htmlFor="cat-nome" error={formError}>
          <Input
            id="cat-nome"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Sobremesas"
          />
        </Field>
        <Field label="Descrição (opcional)" htmlFor="cat-desc">
          <Input
            id="cat-desc"
            value={description}
            maxLength={200}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Um final à altura."
          />
        </Field>
        <Button type="submit" variant="primary" icon={<CirclePlus size={18} aria-hidden="true" />}>
          Adicionar
        </Button>
      </form>

      {categories === null ? (
        <p className={styles.muted}>Carregando…</p>
      ) : categories.length === 0 ? (
        <p className={styles.empty}>Nenhuma categoria ainda.</p>
      ) : (
        <ul className={styles.list}>
          {categories.map((category, index) => (
            <li key={category.id} className={styles.row}>
              <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
              {editing?.id === category.id ? (
                <div className={styles.editFields}>
                  <Input
                    value={editing.name}
                    maxLength={60}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    aria-label="Nome da categoria"
                    autoFocus
                  />
                  <Input
                    value={editing.description}
                    maxLength={200}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    aria-label="Descrição da categoria"
                    placeholder="Descrição (opcional)"
                  />
                </div>
              ) : (
                <div className={styles.rowMain}>
                  <CategoryPhoto
                    category={category}
                    onChange={(updated) =>
                      setCategories((list) => list?.map((c) => (c.id === updated.id ? updated : c)) ?? list)
                    }
                  />
                  <div className={styles.rowInfo}>
                    <span className={styles.rowTitle}>{category.name}</span>
                    <span className={styles.muted}>
                      {category.product_count} {category.product_count === 1 ? 'produto' : 'produtos'}
                      {category.description ? ` · ${category.description}` : ''}
                    </span>
                  </div>
                </div>
              )}
              <div className={styles.rowActions}>
                {editing?.id === category.id ? (
                  <>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => void saveEdit()}
                      aria-label="Salvar"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => setEditing(null)}
                      aria-label="Cancelar edição"
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => void move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Mover ${category.name} para cima`}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => void move(index, 1)}
                      disabled={index === categories.length - 1}
                      aria-label={`Mover ${category.name} para baixo`}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() =>
                        setEditing({ id: category.id, name: category.name, description: category.description ?? '' })
                      }
                      aria-label={`Editar ${category.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.danger}`}
                      onClick={() => void remove(category)}
                      disabled={category.product_count > 0}
                      title={category.product_count > 0 ? 'Mova ou exclua os produtos antes' : 'Excluir'}
                      aria-label={`Excluir ${category.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Foto da seção no cardápio: toque para enviar/trocar.  */
function CategoryPhoto({ category, onChange }: { category: AdminCategory; onChange: (c: AdminCategory) => void }) {
  const { notify } = useAdmin()
  const [busy, setBusy] = useState(false)
  const inputId = `foto-${category.id}`

  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      onChange(await api.uploadCategoryImage(category.id, file))
      notify(`Foto da seção ${category.name} atualizada`)
    } catch (err) {
      notify(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    try {
      onChange(await api.removeCategoryImage(category.id))
      notify(`Foto da seção ${category.name} removida`)
    } catch (err) {
      notify(errorMessage(err))
    }
  }

  return (
    <div className={styles.sectionPhoto}>
      <label
        htmlFor={inputId}
        className={styles.sectionPhotoPick}
        title={category.image_url ? 'Trocar foto da seção' : 'Adicionar foto da seção'}
        aria-busy={busy}
      >
        {category.image_url ? (
          <ProductImage src={category.image_url} alt="" className={styles.sectionPhotoImg} />
        ) : (
          <ImagePlus size={18} aria-hidden="true" />
        )}
        <span className={styles.srOnly}>
          {category.image_url ? `Trocar foto da seção ${category.name}` : `Adicionar foto da seção ${category.name}`}
        </span>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          void upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {category.image_url && (
        <button
          type="button"
          className={styles.sectionPhotoRemove}
          onClick={() => void remove()}
          aria-label={`Remover foto da seção ${category.name}`}
          title="Remover foto"
        >
          <ImageOff size={14} />
        </button>
      )}
    </div>
  )
}
