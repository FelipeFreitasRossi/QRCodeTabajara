import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Cake, Gift, KeyRound, Lock, Save, Search, SlidersHorizontal, Users, UserX, X } from 'lucide-react'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { RewardsAdmin } from '../../components/admin/RewardsAdmin'
import { Switch } from '../../components/admin/Switch'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/FormControls'
import { useAdmin } from '../../hooks/useAdmin'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { errorMessage } from '../../services/api'
import * as api from '../../services/adminService'
import type { AdminCustomer, AdminProduct, ClubSettings } from '../../types/admin'
import { cx } from '../../utils/dom'
import { centsToInput, formatDate, formatPoints, maskPhone, onlyDigits, parsePriceToCents } from '../../utils/format'
import styles from './ClubAdminPage.module.css'

type Action = { kind: 'points' | 'pin' | 'remove' | 'birthday'; customer: AdminCustomer }

/** Painel do Clube: regras de pontuação, busca de clientes, ajuste manual, PIN e exclusão (LGPD). */
export function ClubAdminPage() {
  const [tab, setTab] = useState<'clientes' | 'recompensas'>('clientes')
  return (
    <div>
      <AdminPageHeader
        title="Clube Tabajara"
        subtitle="Pontos são creditados automaticamente quando o pedido é marcado como entregue."
      />
      <div className={styles.tabs} role="tablist" aria-label="Seções do Clube">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'clientes'}
          className={cx(styles.tab, tab === 'clientes' && styles.tabOn)}
          onClick={() => setTab('clientes')}
        >
          <Users size={16} aria-hidden="true" /> Regras e clientes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'recompensas'}
          className={cx(styles.tab, tab === 'recompensas' && styles.tabOn)}
          onClick={() => setTab('recompensas')}
        >
          <Gift size={16} aria-hidden="true" /> Recompensas
        </button>
      </div>
      {tab === 'clientes' ? <RulesAndCustomers /> : <RewardsAdmin />}
    </div>
  )
}

function RulesAndCustomers() {
  const { notify } = useAdmin()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [minReward, setMinReward] = useState('1000')
  const [birthdayDays, setBirthdayDays] = useState('30')
  const [settings, setSettings] = useState<ClubSettings | null>(null)
  const [perReal, setPerReal] = useState('1')
  const [minOrder, setMinOrder] = useState('0,00')
  const [savingRules, setSavingRules] = useState(false)

  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 300)
  const [customers, setCustomers] = useState<AdminCustomer[] | null>(null)
  const [action, setAction] = useState<Action | null>(null)

  useEffect(() => {
    api
      .getClubSettings()
      .then((s) => {
        setSettings(s)
        setPerReal(String(s.points_per_real).replace('.', ','))
        setMinOrder(centsToInput(s.min_order_cents))
        setMinReward(String(s.min_reward_points))
        setBirthdayDays(String(s.birthday_min_days))
      })
      .catch((err) => notify(errorMessage(err, 'Não foi possível carregar as regras do Clube.')))
    api
      .listProducts()
      .then(setProducts)
      .catch(() => undefined)
  }, [notify])

  const search = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setCustomers(await api.searchCustomers(debounced, signal))
      } catch (err) {
        if (!signal?.aborted) notify(errorMessage(err, 'Não foi possível buscar clientes.'))
      }
    },
    [debounced, notify],
  )

  useEffect(() => {
    const controller = new AbortController()
    void search(controller.signal)
    return () => controller.abort()
  }, [search])

  const saveRules = async (event: FormEvent) => {
    event.preventDefault()
    if (!settings) return
    const points = Number(perReal.replace(',', '.'))
    const min = parsePriceToCents(minOrder)
    if (!Number.isFinite(points) || points < 0 || points > 100)
      return notify('Pontos por real: use um número de 0 a 100.')
    if (min === null) return notify('Pedido mínimo inválido.')
    const minRewardPoints = Number(minReward.replace(/\D/g, ''))
    if (!minRewardPoints) return notify('Informe o mínimo de pontos das recompensas.')
    const days = Number(birthdayDays.replace(/\D/g, '') || '0')
    if (settings.birthday_enabled && !settings.birthday_product_id)
      return notify('Escolha o prato do presente de aniversário.')
    setSavingRules(true)
    try {
      const next = await api.updateClubSettings({
        enabled: settings.enabled,
        points_per_real: points,
        min_order_cents: min,
        excluded_category_ids: settings.excluded_category_ids,
        min_reward_points: minRewardPoints,
        birthday_enabled: settings.birthday_enabled,
        birthday_product_id: settings.birthday_product_id,
        birthday_min_days: Math.min(365, days),
      })
      setSettings(next)
      notify('Regras do Clube salvas')
    } catch (err) {
      notify(errorMessage(err))
    } finally {
      setSavingRules(false)
    }
  }

  const replaceCustomer = (updated: AdminCustomer) =>
    setCustomers((list) => list?.map((c) => (c.id === updated.id ? updated : c)) ?? list)

  return (
    <div>
      {/* Regras */}
      <form className={styles.card} onSubmit={saveRules} noValidate>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Regras de pontuação</h2>
          {settings && (
            <Switch
              checked={settings.enabled}
              onChange={(enabled) => setSettings({ ...settings, enabled })}
              label={settings.enabled ? 'Clube ativo' : 'Clube pausado'}
            />
          )}
        </div>
        <div className={styles.rulesGrid}>
          <Field label="Pontos por R$ 1" htmlFor="clube-por-real" hint="Ex.: 1 = R$ 89,90 vale 89 pontos.">
            <Input
              id="clube-por-real"
              inputMode="decimal"
              value={perReal}
              onChange={(e) => setPerReal(e.target.value)}
            />
          </Field>
          <Field label="Pedido mínimo (R$)" htmlFor="clube-minimo" hint="0,00 = qualquer valor pontua.">
            <Input
              id="clube-minimo"
              inputMode="decimal"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
            />
          </Field>
          <Field
            label="Recompensas a partir de (pontos)"
            htmlFor="clube-min-recompensa"
            hint="Sugestão: 1.000 pontos (≈ R$ 1.000 em pedidos com 1 ponto por real)."
          >
            <Input
              id="clube-min-recompensa"
              inputMode="numeric"
              value={minReward}
              onChange={(e) => setMinReward(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
        </div>
        <div className={styles.birthdayBox}>
          <div className={styles.cardHead}>
            <h3 className={styles.subTitle}>
              <Cake size={18} aria-hidden="true" /> Presente de aniversário
            </h3>
            {settings && (
              <Switch
                checked={settings.birthday_enabled}
                onChange={(birthday_enabled) => setSettings({ ...settings, birthday_enabled })}
                label={settings.birthday_enabled ? 'Ativo' : 'Desligado'}
              />
            )}
          </div>
          <div className={styles.rulesGrid2}>
            <Field label="Prato de presente" htmlFor="clube-presente" hint="Um por cliente, no mês do aniversário.">
              <Select
                id="clube-presente"
                value={settings?.birthday_product_id ?? ''}
                onChange={(e) => settings && setSettings({ ...settings, birthday_product_id: e.target.value || null })}
              >
                <option value="">Escolha um prato…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Carência (dias)"
              htmlFor="clube-carencia"
              hint="Data precisa estar no cadastro há esse tempo. Evita fraude."
            >
              <Input
                id="clube-carencia"
                inputMode="numeric"
                value={birthdayDays}
                onChange={(e) => setBirthdayDays(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
          </div>
        </div>
        <div className={styles.rulesFooter}>
          <p className={styles.help}>
            Mudanças valem para pedidos novos. Pedidos já enviados mantêm os pontos calculados na hora do pedido.
          </p>
          <Button
            type="submit"
            variant="primary"
            disabled={!settings || savingRules}
            icon={<Save size={16} aria-hidden="true" />}
          >
            {savingRules ? 'Salvando…' : 'Salvar regras'}
          </Button>
        </div>
      </form>

      {/* Clientes */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Clientes</h2>
          <span className={styles.muted}>{customers ? `${customers.length} encontrados` : 'Carregando…'}</span>
        </div>
        <div className={styles.searchBox}>
          <Search size={17} aria-hidden="true" />
          <Input
            aria-label="Buscar cliente"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, celular ou CPF completo"
          />
        </div>

        {customers && customers.length === 0 && <p className={styles.empty}>Nenhum cliente encontrado.</p>}

        <ul className={styles.list}>
          {customers?.map((c) => (
            <li key={c.id} className={styles.row}>
              <div className={styles.who}>
                <span className={styles.avatar} aria-hidden="true">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div className={styles.whoText}>
                  <span className={styles.name}>
                    {c.name}
                    {c.locked && (
                      <span className={styles.locked} title="Bloqueado por tentativas erradas de PIN">
                        <Lock size={12} aria-hidden="true" /> bloqueado
                      </span>
                    )}
                  </span>
                  <span className={styles.meta}>
                    CPF {c.cpf_tail} · {maskPhone(c.phone)} · desde {formatDate(c.member_since)}
                    {c.birthday ? ` · aniversário ${c.birthday}` : ''}
                  </span>
                </div>
              </div>
              <div className={styles.balance}>
                <strong>{formatPoints(c.balance)}</strong>
                <span>pontos</span>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => setAction({ kind: 'points', customer: c })}
                >
                  <SlidersHorizontal size={15} aria-hidden="true" /> Pontos
                </button>
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => setAction({ kind: 'birthday', customer: c })}
                  aria-label={`Aniversário de ${c.name}`}
                  title="Aniversário"
                >
                  <Cake size={15} aria-hidden="true" />
                </button>
                <button type="button" className={styles.action} onClick={() => setAction({ kind: 'pin', customer: c })}>
                  <KeyRound size={15} aria-hidden="true" /> PIN
                </button>
                <button
                  type="button"
                  className={cx(styles.action, styles.danger)}
                  onClick={() => setAction({ kind: 'remove', customer: c })}
                  aria-label={`Excluir dados de ${c.name}`}
                  title="Excluir dados pessoais (LGPD)"
                >
                  <UserX size={15} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {action && (
        <ActionDialog
          action={action}
          onClose={() => setAction(null)}
          onDone={(updated, message) => {
            if (updated) replaceCustomer(updated)
            else setCustomers((list) => list?.filter((c) => c.id !== action.customer.id) ?? list)
            notify(message)
            setAction(null)
          }}
        />
      )}
    </div>
  )
}

function ActionDialog({
  action,
  onClose,
  onDone,
}: {
  action: Action
  onClose: () => void
  onDone: (updated: AdminCustomer | null, message: string) => void
}) {
  const { kind, customer } = action
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [pin, setPin] = useState('')
  const [confirmName, setConfirmName] = useState('')
  const [bday, setBday] = useState(customer.birthday?.split('/')[0] ?? '')
  const [bmonth, setBmonth] = useState(customer.birthday?.split('/')[1] ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (kind === 'points') {
        const value = Number(points.replace(/[^\d-]/g, ''))
        if (!Number.isInteger(value) || value === 0) throw new Error('Informe quantos pontos (use - para tirar).')
        if (reason.trim().length < 3) throw new Error('Explique o motivo (fica no extrato do cliente).')
        const updated = await api.adjustCustomerPoints(customer.id, value, reason.trim())
        onDone(updated, `${value > 0 ? '+' : ''}${formatPoints(value)} pontos para ${customer.name}`)
      } else if (kind === 'pin') {
        if (!/^\d{4,6}$/.test(pin)) throw new Error('O PIN tem de 4 a 6 números.')
        const updated = await api.resetCustomerPin(customer.id, pin)
        onDone(updated, `PIN de ${customer.name} redefinido`)
      } else if (kind === 'birthday') {
        const d = Number(bday)
        const m = Number(bmonth)
        if (!d || !m) throw new Error('Informe dia e mês.')
        const updated = await api.setCustomerBirthday(customer.id, d, m, null)
        onDone(updated, `Aniversário de ${customer.name} salvo`)
      } else {
        if (confirmName.trim().toLowerCase() !== customer.name.trim().toLowerCase())
          throw new Error('Digite o nome exatamente como aparece para confirmar.')
        await api.anonymizeCustomer(customer.id)
        onDone(null, 'Dados pessoais excluídos')
      }
    } catch (err) {
      setError(err instanceof Error && !('status' in err) ? err.message : errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const titles = {
    points: 'Ajustar pontos',
    pin: 'Redefinir PIN',
    birthday: 'Aniversário',
    remove: 'Excluir dados pessoais',
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
      >
        <div className={styles.dialogHead}>
          <div>
            <h2 id="dialogo-titulo" className={styles.cardTitle}>
              {titles[kind]}
            </h2>
            <p className={styles.muted}>
              {customer.name} · saldo {formatPoints(customer.balance)} pontos
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        {kind === 'points' && (
          <>
            <Field label="Pontos" htmlFor="ajuste-pontos" hint="Positivo para dar, negativo (ex.: -50) para tirar.">
              <Input
                id="ajuste-pontos"
                inputMode="numeric"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Motivo" htmlFor="ajuste-motivo" hint="Ex.: Compra no balcão, comanda 1234.">
              <Input id="ajuste-motivo" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </>
        )}

        {kind === 'pin' && (
          <Field
            label="Novo PIN"
            htmlFor="novo-pin"
            hint="Confira um documento com foto antes. Informe o PIN só ao cliente."
          >
            <Input
              id="novo-pin"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(onlyDigits(e.target.value).slice(0, 6))}
              autoFocus
              autoComplete="off"
            />
          </Field>
        )}

        {kind === 'birthday' && (
          <>
            <div className={styles.rulesGrid2}>
              <Field label="Dia" htmlFor="aniv-dia">
                <Input
                  id="aniv-dia"
                  inputMode="numeric"
                  value={bday}
                  maxLength={2}
                  onChange={(e) => setBday(onlyDigits(e.target.value))}
                  autoFocus
                />
              </Field>
              <Field label="Mês" htmlFor="aniv-mes">
                <Input
                  id="aniv-mes"
                  inputMode="numeric"
                  value={bmonth}
                  maxLength={2}
                  onChange={(e) => setBmonth(onlyDigits(e.target.value))}
                />
              </Field>
            </div>
            <p className={styles.help}>
              Confira um documento com foto. Data salva pela equipe libera o presente na hora (sem carência).
            </p>
          </>
        )}

        {kind === 'remove' && (
          <>
            <p className={styles.warning}>
              Apaga nome, CPF, celular e e-mail e desativa o cadastro. O extrato de pontos fica guardado sem identificar
              a pessoa. <strong>Não dá para desfazer.</strong>
            </p>
            <Field label={`Digite "${customer.name}" para confirmar`} htmlFor="confirmar-nome">
              <Input
                id="confirmar-nome"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                autoComplete="off"
              />
            </Field>
          </>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.dialogActions}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={busy}
            className={kind === 'remove' ? styles.dangerButton : undefined}
          >
            {busy ? 'Aguarde…' : kind === 'remove' ? 'Excluir dados' : 'Confirmar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
