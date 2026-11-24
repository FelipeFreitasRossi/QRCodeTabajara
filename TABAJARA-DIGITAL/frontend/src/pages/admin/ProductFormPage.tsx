import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import { ArrowLeft, ImagePlus, Save, Trash2, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { Switch } from '../../components/admin/Switch'
import { TagInput } from '../../components/admin/TagInput'
import { ProductCard } from '../../components/menu/ProductCard'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, TextArea } from '../../components/ui/FormControls'
import { useAdmin } from '../../hooks/useAdmin'
import { resolveAssetUrl, errorMessage } from '../../services/api'
import * as api from '../../services/adminService'
import type { AdminCategory, AdminProduct, ProductInput } from '../../types/admin'
import type { Product } from '../../types/menu'
import { cx } from '../../utils/dom'
import { centsToInput, parsePriceToCents } from '../../utils/format'
import styles from './ProductFormPage.module.css'

const COMMON_ALLERGENS = [
  'Glúten',
  'Lactose',
  'Leite',
  'Ovo',
  'Soja',
  'Amendoim',
  'Castanhas',
  'Peixe',
  'Crustáceos',
  'Gergelim',
  'Mostarda',
  'Sulfitos',
]
const MAX_FILE_MB = 8
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

interface FormState {
  name: string
  categoryId: string
  description: string
  price: string
  ingredients: string[]
  allergens: string[]
  featured: boolean
  available: boolean
}

const EMPTY: FormState = {
  name: '',
  categoryId: '',
  description: '',
  price: '',
  ingredients: [],
  allergens: [],
  featured: false,
  available: true,
}

type Errors = Partial<Record<'name' | 'categoryId' | 'price' | 'photo', string>>

/** Cadastro e edição de produto, com foto e prévia de como aparece no cardápio. */
export function ProductFormPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { notify } = useAdmin()
  const fileInput = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [product, setProduct] = useState<AdminProduct | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [file, setFile] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([api.listCategories(), isNew ? Promise.resolve(null) : api.getProduct(id!)])
      .then(([cats, existing]) => {
        if (!active) return
        setCategories(cats)
        if (existing) {
          setProduct(existing)
          setForm({
            name: existing.name,
            categoryId: existing.category_id,
            description: existing.description ?? '',
            price: centsToInput(existing.price_cents),
            ingredients: existing.ingredients,
            allergens: existing.allergens,
            featured: existing.featured,
            available: existing.available,
          })
        } else if (cats.length > 0) {
          setForm((current) => ({ ...current, categoryId: current.categoryId || cats[0].id }))
        }
      })
      .catch((err) => active && setLoadError(errorMessage(err, 'Não foi possível carregar.')))
    return () => {
      active = false
    }
  }, [id, isNew])

  // Prévia local da foto escolhida (antes de enviar).
  const filePreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(
    () => () => {
      if (filePreview) URL.revokeObjectURL(filePreview)
    },
    [filePreview],
  )

  const currentPhoto = filePreview ?? (removePhoto ? null : (product?.image_url ?? null))

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    // Ao corrigir um campo, a mensagem de erro dele some.
    if (key === 'name' || key === 'categoryId' || key === 'price') {
      setErrors((current) => ({ ...current, [key]: undefined }))
    }
  }

  const pickFile = (candidate: File | undefined) => {
    if (!candidate) return
    if (!ACCEPTED.includes(candidate.type)) {
      setErrors((e) => ({ ...e, photo: 'Use uma imagem JPG, PNG ou WebP.' }))
      return
    }
    if (candidate.size > MAX_FILE_MB * 1024 * 1024) {
      setErrors((e) => ({ ...e, photo: `A imagem deve ter no máximo ${MAX_FILE_MB} MB.` }))
      return
    }
    setErrors((e) => ({ ...e, photo: undefined }))
    setFile(candidate)
    setRemovePhoto(false)
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    pickFile(event.target.files?.[0])
    event.target.value = '' // permite escolher o mesmo arquivo de novo
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    pickFile(event.dataTransfer.files?.[0])
  }

  const toggleAllergen = (allergen: string) =>
    set(
      'allergens',
      form.allergens.includes(allergen) ? form.allergens.filter((a) => a !== allergen) : [...form.allergens, allergen],
    )

  const validate = (): ProductInput | null => {
    const next: Errors = {}
    if (form.name.trim().length < 2) next.name = 'Informe o nome do produto.'
    if (!form.categoryId) next.categoryId = 'Escolha a categoria.'
    const cents = parsePriceToCents(form.price)
    if (cents === null) next.price = 'Informe um preço válido, ex.: 49,90'
    setErrors((e) => ({ ...next, photo: e.photo }))
    if (Object.keys(next).length > 0 || cents === null) return null
    return {
      name: form.name.trim(),
      category_id: form.categoryId,
      description: form.description.trim() || null,
      price_cents: cents,
      ingredients: form.ingredients,
      allergens: form.allergens,
      featured: form.featured,
      available: form.available,
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaveError(null)
    const payload = validate()
    if (!payload || saving) return

    setSaving(true)
    try {
      let saved = isNew ? await api.createProduct(payload) : await api.updateProduct(id!, payload)
      if (file) {
        try {
          saved = await api.uploadProductImage(saved.id, file)
        } catch (err) {
          // Produto salvo, mas a foto falhou: abre a edição para tentar de novo.
          notify(`Produto salvo, mas a foto não foi enviada: ${errorMessage(err)}`)
          navigate(`/admin/produtos/${saved.id}`, { replace: true })
          return
        }
      } else if (removePhoto && product?.image_url) {
        saved = await api.removeProductImage(saved.id)
      }
      notify(isNew ? 'Produto criado' : 'Alterações salvas')
      navigate('/admin/produtos')
    } catch (err) {
      setSaveError(errorMessage(err, 'Não foi possível salvar o produto.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!product || !window.confirm(`Excluir "${product.name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await api.deleteProduct(product.id)
      notify('Produto excluído')
      navigate('/admin/produtos')
    } catch (err) {
      setSaveError(errorMessage(err, 'Não foi possível excluir.'))
    }
  }

  // Produto "de mentira" para a prévia no estilo do cardápio.
  const preview: Product = {
    id: product?.id ?? 'previa',
    name: form.name.trim() || 'Nome do produto',
    slug: 'previa',
    description: form.description.trim() || null,
    price_cents: parsePriceToCents(form.price) ?? 0,
    image_url: currentPhoto,
    ingredients: form.ingredients,
    allergens: form.allergens,
    featured: form.featured,
    available: form.available,
  }

  if (loadError) {
    return (
      <div>
        <Link to="/admin/produtos" className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" /> Produtos
        </Link>
        <p className={styles.alert}>{loadError}</p>
      </div>
    )
  }

  const customAllergens = form.allergens.filter((a) => !COMMON_ALLERGENS.includes(a))

  return (
    <div>
      <Link to="/admin/produtos" className={styles.back}>
        <ArrowLeft size={16} aria-hidden="true" /> Produtos
      </Link>
      <AdminPageHeader
        title={isNew ? 'Novo produto' : 'Editar produto'}
        subtitle={
          isNew
            ? 'Preencha os dados e salve para publicar no cardápio.'
            : 'As alterações aparecem no cardápio ao salvar.'
        }
      />

      <form className={styles.layout} onSubmit={handleSubmit} noValidate>
        <div className={styles.main}>
          {/* Foto */}
          <section className={styles.card} aria-labelledby="foto-titulo">
            <h2 id="foto-titulo" className={styles.cardTitle}>
              Foto
            </h2>
            <div
              className={cx(styles.dropzone, dragging && styles.dragging, currentPhoto && styles.hasPhoto)}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              {currentPhoto ? (
                <img
                  src={resolveAssetUrl(currentPhoto) ?? ''}
                  alt="Prévia da foto do produto"
                  className={styles.photo}
                />
              ) : (
                <div className={styles.dropText}>
                  <ImagePlus size={32} strokeWidth={1.25} aria-hidden="true" />
                  <p>Arraste uma foto aqui ou toque para escolher</p>
                  <p className={styles.small}>JPG, PNG ou WebP · até {MAX_FILE_MB} MB · horizontal fica melhor</p>
                </div>
              )}
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPTED.join(',')}
                onChange={onFileChange}
                className={styles.fileInput}
                aria-label="Escolher foto do produto"
              />
            </div>
            <div className={styles.photoActions}>
              <Button onClick={() => fileInput.current?.click()} icon={<ImagePlus size={16} aria-hidden="true" />}>
                {currentPhoto ? 'Trocar foto' : 'Escolher foto'}
              </Button>
              {currentPhoto && (
                <Button
                  variant="ghost"
                  icon={<X size={16} aria-hidden="true" />}
                  onClick={() => {
                    setFile(null)
                    setRemovePhoto(true)
                  }}
                >
                  Remover foto
                </Button>
              )}
            </div>
            {errors.photo && <p className={styles.fieldError}>{errors.photo}</p>}
            {file && <p className={styles.small}>A foto será otimizada e enviada ao salvar.</p>}
          </section>

          {/* Dados */}
          <section className={styles.card} aria-labelledby="dados-titulo">
            <h2 id="dados-titulo" className={styles.cardTitle}>
              Informações
            </h2>
            <div className={styles.grid}>
              <Field label="Nome" htmlFor="prod-nome" error={errors.name} className={styles.full}>
                <Input
                  id="prod-nome"
                  value={form.name}
                  maxLength={80}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Ex.: Picanha"
                />
              </Field>
              <Field label="Categoria" htmlFor="prod-cat" error={errors.categoryId}>
                <Select id="prod-cat" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                  <option value="">Selecione</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Preço (R$)" htmlFor="prod-preco" error={errors.price}>
                <Input
                  id="prod-preco"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder="0,00"
                />
              </Field>
              <Field
                label="Descrição"
                htmlFor="prod-desc"
                counter={`${form.description.length}/400`}
                className={styles.full}
              >
                <TextArea
                  id="prod-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value.slice(0, 400))}
                  placeholder="Como o prato é servido, porção, ponto da carne…"
                />
              </Field>
              <Field
                label="Ingredientes"
                htmlFor="prod-ingr"
                hint="Digite e aperte Enter para adicionar."
                className={styles.full}
              >
                <TagInput
                  id="prod-ingr"
                  values={form.ingredients}
                  onChange={(v) => set('ingredients', v)}
                  placeholder="Ex.: Picanha, Sal grosso"
                />
              </Field>
            </div>
          </section>

          {/* Alergênicos */}
          <section className={styles.card} aria-labelledby="alerg-titulo">
            <h2 id="alerg-titulo" className={styles.cardTitle}>
              Alergênicos
            </h2>
            <div className={styles.chips}>
              {COMMON_ALLERGENS.map((allergen) => {
                const on = form.allergens.includes(allergen)
                return (
                  <button
                    key={allergen}
                    type="button"
                    className={cx(styles.chip, on && styles.chipOn)}
                    aria-pressed={on}
                    onClick={() => toggleAllergen(allergen)}
                  >
                    {allergen}
                  </button>
                )
              })}
            </div>
            <Field label="Outros" htmlFor="prod-alerg" hint="Algum alergênico que não está na lista.">
              <TagInput
                id="prod-alerg"
                values={customAllergens}
                onChange={(v) =>
                  set('allergens', [...form.allergens.filter((a) => COMMON_ALLERGENS.includes(a)), ...v])
                }
              />
            </Field>
          </section>
        </div>

        <aside className={styles.side}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Publicação</h2>
            <Switch checked={form.available} onChange={(v) => set('available', v)} label="Disponível para pedido" />
            <Switch checked={form.featured} onChange={(v) => set('featured', v)} label="Destaque da Casa" />
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Prévia no cardápio</h2>
            <div className={styles.preview} aria-hidden="true">
              <ProductCard product={preview} onSelect={() => undefined} />
            </div>
          </section>

          {saveError && (
            <p className={styles.alert} role="alert">
              {saveError}
            </p>
          )}

          <div className={styles.saveBar}>
            <Button
              type="submit"
              variant="primary"
              block
              disabled={saving}
              icon={<Save size={18} aria-hidden="true" />}
            >
              {saving ? 'Salvando…' : isNew ? 'Criar produto' : 'Salvar alterações'}
            </Button>
            {!isNew && (
              <Button
                variant="ghost"
                onClick={() => void handleDelete()}
                icon={<Trash2 size={16} aria-hidden="true" />}
              >
                Excluir produto
              </Button>
            )}
          </div>
        </aside>
      </form>
    </div>
  )
}
