import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CirclePlus, ImagePlus, Pencil, Trash2, X } from 'lucide-react'

import { useAdmin } from '../../hooks/useAdmin'
import { errorMessage } from '../../services/api'
import * as api from '../../services/adminService'
import type { AdminProduct, AdminReward, RewardInput } from '../../types/admin'
import { formatPoints, onlyDigits } from '../../utils/format'
import { Button } from '../ui/Button'
import { Field, Input, Select, TextArea } from '../ui/FormControls'
import { Points } from '../ui/Money'
import { ProductImage } from '../ui/ProductImage'
import { Switch } from './Switch'
import styles from './RewardsAdmin.module.css'

const EMPTY: RewardInput = {
  name: '',
  description: null,
  points_cost: 1000,
  product_id: null,
  active: true,
  stock: null,
  position: 0,
}

/** Catálogo de recompensas do Clube: criar, editar, foto, estoque e ativar/pausar. */
export function RewardsAdmin() {
  const { notify } = useAdmin()
  const [rewards, setRewards] = useState<AdminReward[] | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [minPoints, setMinPoints] = useState(1000)
  const [editing, setEditing] = useState<AdminReward | 'new' | null>(null)

  const load = useCallback(() => {
    api
      .listRewards()
      .then(setRewards)
      .catch((err) => notify(errorMessage(err, 'Não foi possível carregar as recompensas.')))
  }, [notify])

  useEffect(() => {
    load()
    api
      .listProducts()
      .then(setProducts)
      .catch(() => undefined)
    api
      .getClubSettings()
      .then((s) => setMinPoints(s.min_reward_points))
      .catch(() => undefined)
  }, [load])

  const replace = (r: AdminReward) =>
    setRewards((list) =>
      list?.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? r : x)) : [...(list ?? []), r],
    )

  const toggle = async (r: AdminReward, active: boolean) => {
    try {
      replace(await api.updateReward(r.id, { ...toInput(r), active }))
    } catch (err) {
      notify(errorMessage(err))
    }
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Recompensas</h2>
          <p className={styles.muted}>
            Clientes trocam pontos por estes itens no carrinho. Os pontos são debitados no envio do pedido e devolvidos
            se ele for cancelado. Mínimo atual: {formatPoints(minPoints)} pontos.
          </p>
        </div>
        <Button variant="primary" icon={<CirclePlus size={16} aria-hidden="true" />} onClick={() => setEditing('new')}>
          Nova recompensa
        </Button>
      </div>

      {rewards && rewards.length === 0 && (
        <p className={styles.empty}>
          Nenhuma recompensa ainda. Crie a primeira, por exemplo um prato da casa por {formatPoints(minPoints)} pontos.
        </p>
      )}

      <ul className={styles.grid}>
        {rewards?.map((r) => (
          <li key={r.id} className={styles.card}>
            <ProductImage src={r.image_url} alt="" className={styles.image} muted={!r.active} />
            <div className={styles.body}>
              <span className={styles.name}>{r.name}</span>
              <Points value={r.points_cost} className={styles.cost} />
              <span className={styles.meta}>
                {r.stock === null ? 'Sem limite' : `${r.stock} em estoque`} · {r.redeemed_count} resgatados
              </span>
            </div>
            <div className={styles.actions}>
              <Switch checked={r.active} onChange={(v) => void toggle(r, v)} label={r.active ? 'Ativa' : 'Pausada'} />
              <button
                type="button"
                className={styles.icon}
                onClick={() => setEditing(r)}
                aria-label={`Editar ${r.name}`}
              >
                <Pencil size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <RewardDialog
          reward={editing === 'new' ? null : editing}
          products={products}
          minPoints={minPoints}
          onClose={() => setEditing(null)}
          onSaved={(r, msg) => {
            replace(r)
            notify(msg)
            setEditing(null)
          }}
          onDeleted={(id) => {
            setRewards((list) => list?.filter((x) => x.id !== id) ?? list)
            notify('Recompensa removida')
            setEditing(null)
          }}
        />
      )}
    </section>
  )
}

function toInput(r: AdminReward): RewardInput {
  return {
    name: r.name,
    description: r.description,
    points_cost: r.points_cost,
    product_id: r.product_id,
    active: r.active,
    stock: r.stock,
    position: r.position,
  }
}

function RewardDialog({
  reward,
  products,
  minPoints,
  onClose,
  onSaved,
  onDeleted,
}: {
  reward: AdminReward | null
  products: AdminProduct[]
  minPoints: number
  onClose: () => void
  onSaved: (r: AdminReward, message: string) => void
  onDeleted: (id: string) => void
}) {
  const [data, setData] = useState<RewardInput>(reward ? toInput(reward) : { ...EMPTY, points_cost: minPoints })
  const [cost, setCost] = useState(String(reward?.points_cost ?? minPoints))
  const [stock, setStock] = useState(reward?.stock === null || !reward ? '' : String(reward.stock))
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pickProduct = (id: string) => {
    const product = products.find((p) => p.id === id)
    setData((d) => ({ ...d, product_id: id || null, name: d.name || product?.name || '' }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const points = Number(cost)
    if (data.name.trim().length < 2) return setError('Informe o nome da recompensa.')
    if (!points || points < minPoints) return setError(`O mínimo é ${formatPoints(minPoints)} pontos.`)
    const payload: RewardInput = {
      ...data,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      points_cost: points,
      stock: stock === '' ? null : Number(stock),
    }
    setBusy(true)
    try {
      let saved = reward ? await api.updateReward(reward.id, payload) : await api.createReward(payload)
      if (file) saved = await api.uploadRewardImage(saved.id, file)
      onSaved(saved, reward ? 'Recompensa atualizada' : 'Recompensa criada')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!reward || !window.confirm(`Remover “${reward.name}” do catálogo?`)) return
    try {
      await api.deleteReward(reward.id)
      onDeleted(reward.id)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const linked = products.find((p) => p.id === data.product_id)
  const preview = file ? URL.createObjectURL(file) : (reward?.image_url ?? linked?.image_url ?? null)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recompensa-titulo"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
      >
        <div className={styles.dialogHead}>
          <h2 id="recompensa-titulo" className={styles.title}>
            {reward ? 'Editar recompensa' : 'Nova recompensa'}
          </h2>
          <button type="button" className={styles.icon} onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className={styles.photoRow}>
          <ProductImage src={preview} alt="" className={styles.preview} />
          <div className={styles.photoActions}>
            <button type="button" className={styles.photoButton} onClick={() => fileRef.current?.click()}>
              <ImagePlus size={16} aria-hidden="true" /> {preview ? 'Trocar foto' : 'Enviar foto'}
            </button>
            <span className={styles.muted}>Sem foto própria, usa a do prato vinculado.</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <Field label="Prato do cardápio (opcional)" htmlFor="rec-prato" hint="Vincula nome e foto e avisa a cozinha.">
          <Select id="rec-prato" value={data.product_id ?? ''} onChange={(e) => pickProduct(e.target.value)}>
            <option value="">Nenhum (item próprio)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nome" htmlFor="rec-nome">
          <Input
            id="rec-nome"
            value={data.name}
            maxLength={80}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="Ex.: Picanha para 2"
          />
        </Field>
        <Field label="Descrição (opcional)" htmlFor="rec-desc">
          <TextArea
            id="rec-desc"
            rows={2}
            value={data.description ?? ''}
            maxLength={300}
            onChange={(e) => setData({ ...data, description: e.target.value })}
          />
        </Field>
        <div className={styles.two}>
          <Field label="Custo em pontos" htmlFor="rec-custo" hint={`Mínimo ${formatPoints(minPoints)}.`}>
            <Input
              id="rec-custo"
              inputMode="numeric"
              value={cost}
              onChange={(e) => setCost(onlyDigits(e.target.value))}
            />
          </Field>
          <Field label="Estoque (opcional)" htmlFor="rec-estoque" hint="Vazio = sem limite.">
            <Input
              id="rec-estoque"
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(onlyDigits(e.target.value))}
            />
          </Field>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.dialogActions}>
          {reward && (
            <button type="button" className={styles.delete} onClick={() => void remove()}>
              <Trash2 size={15} aria-hidden="true" /> Remover
            </button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
