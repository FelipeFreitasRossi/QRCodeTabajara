import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { BellRing, CirclePlus, Copy, Download, ReceiptText, RefreshCw, Trash2 } from 'lucide-react'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { BillSheet } from '../../components/admin/BillSheet'
import { Switch } from '../../components/admin/Switch'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/FormControls'
import { useAdmin } from '../../hooks/useAdmin'
import { errorMessage } from '../../services/api'
import * as api from '../../services/adminService'
import type { AdminTable } from '../../types/admin'
import { cx } from '../../utils/dom'
import styles from './CatalogAdmin.module.css'

/** Mesas que o cliente pode escolher ao enviar o pedido. */
export function TablesPage() {
  const { notify } = useAdmin()
  const [tables, setTables] = useState<AdminTable[] | null>(null)
  const [billTable, setBillTable] = useState<number | null>(null)
  const [billOpen, setBillOpen] = useState(false)
  const [number, setNumber] = useState('')
  const [label, setLabel] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setTables(await api.listTables())
    } catch (err) {
      notify(errorMessage(err, 'Não foi possível carregar as mesas.'))
    }
  }, [notify])

  useEffect(() => {
    void load()
  }, [load])

  const create = async (event: FormEvent) => {
    event.preventDefault()
    const value = Number(number)
    if (!Number.isInteger(value) || value < 1 || value > 999) {
      setFormError('Informe um número entre 1 e 999.')
      return
    }
    try {
      await api.createTable({ number: value, label: label.trim() || null, active: true })
      setNumber('')
      setLabel('')
      setFormError(null)
      notify(`Mesa ${value} criada`)
      void load()
    } catch (err) {
      setFormError(errorMessage(err))
    }
  }

  const toggle = async (table: AdminTable, active: boolean) => {
    setTables((current) => current?.map((t) => (t.id === table.id ? { ...t, active } : t)) ?? current)
    try {
      await api.updateTable(table.id, { number: table.number, label: table.label, active, seats: table.seats })
    } catch (err) {
      notify(errorMessage(err))
      void load()
    }
  }

  const remove = async (table: AdminTable) => {
    if (!window.confirm(`Excluir a mesa ${table.number}?`)) return
    try {
      await api.deleteTable(table.id)
      notify('Mesa excluída')
      void load()
    } catch (err) {
      notify(errorMessage(err))
    }
  }

  const downloadQr = async (table: AdminTable, tipo: 'cardapio' | 'chamar' = 'cardapio') => {
    try {
      const blob = await api.downloadTableQr(table.id, tipo)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const prefix = tipo === 'chamar' ? 'chamar-atendente' : 'qrcode'
      link.download = `${prefix}-mesa-${String(table.number).padStart(2, '0')}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      notify(errorMessage(err))
    }
  }

  const copyLink = async (table: AdminTable) => {
    if (!table.qr_url) return
    try {
      await navigator.clipboard.writeText(table.qr_url)
      notify('Link do QR Code copiado')
    } catch {
      notify(table.qr_url)
    }
  }

  const regenerate = async (table: AdminTable) => {
    const ok = window.confirm(
      `Gerar um QR Code novo para a mesa ${table.number}? Os QR impressos atuais (cardápio e chamar atendente) deixam de funcionar e precisarão ser trocados.`,
    )
    if (!ok) return
    try {
      const updated = await api.regenerateTableQr(table.id)
      setTables((current) => current?.map((t) => (t.id === updated.id ? updated : t)) ?? current)
      notify(`Novo QR Code da mesa ${table.number} gerado`)
    } catch (err) {
      notify(errorMessage(err))
    }
  }

  const activeCount = tables?.filter((t) => t.active).length ?? 0

  return (
    <div>
      <AdminPageHeader
        title="Mesas"
        subtitle={
          tables
            ? `${activeCount} de ${tables.length} mesas ativas · cada mesa tem um QR Code que abre o cardápio já identificado`
            : 'Carregando…'
        }
      />

      <form className={styles.addCard} onSubmit={create} noValidate>
        <Field label="Número" htmlFor="mesa-num" error={formError}>
          <Input
            id="mesa-num"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Ex.: 13"
          />
        </Field>
        <Field label="Local (opcional)" htmlFor="mesa-local">
          <Input
            id="mesa-local"
            value={label}
            maxLength={40}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex.: Varanda"
          />
        </Field>
        <Button type="submit" variant="primary" icon={<CirclePlus size={18} aria-hidden="true" />}>
          Adicionar mesa
        </Button>
      </form>

      {tables && tables.length === 0 && <p className={styles.empty}>Nenhuma mesa cadastrada.</p>}

      <ul className={styles.tableGrid}>
        {tables?.map((table) => (
          <li key={table.id} className={cx(styles.tableCard, !table.active && styles.inactive)}>
            <div className={styles.tableHead}>
              <span className={styles.tableNumber}>{String(table.number).padStart(2, '0')}</span>
              <button
                type="button"
                className={`${styles.iconButton} ${styles.danger}`}
                onClick={() => void remove(table)}
                aria-label={`Excluir mesa ${table.number}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <span className={styles.muted}>{table.label ?? 'Salão'}</span>
            <Switch
              checked={table.active}
              onChange={(active) => void toggle(table, active)}
              label={table.active ? 'Ativa' : 'Inativa'}
            />
            <div className={styles.qrActions}>
              <button type="button" className={styles.qrButton} onClick={() => void downloadQr(table)}>
                <Download size={15} aria-hidden="true" /> QR do cardápio
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => void copyLink(table)}
                aria-label={`Copiar link do QR da mesa ${table.number}`}
                title="Copiar link"
              >
                <Copy size={15} />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => void regenerate(table)}
                aria-label={`Gerar novo QR Code para a mesa ${table.number}`}
                title="Gerar novo QR (invalida o antigo)"
              >
                <RefreshCw size={15} />
              </button>
            </div>
            <div className={styles.qrActions}>
              <button
                type="button"
                className={styles.qrButton}
                onClick={() => void downloadQr(table, 'chamar')}
                title="Abre só a página de chamar atendente, sem o cardápio"
              >
                <BellRing size={15} aria-hidden="true" /> QR de chamar atendente
              </button>
            </div>
            <div className={styles.qrActions}>
              <button
                type="button"
                className={styles.qrButton}
                onClick={() => {
                  setBillTable(table.number)
                  setBillOpen(true)
                }}
                title="Pedidos desta mesa ainda não fechados"
              >
                <ReceiptText size={15} aria-hidden="true" /> Conta da mesa
              </button>
            </div>
          </li>
        ))}
      </ul>

      {billTable !== null && (
        <BillSheet
          tableNumber={billTable}
          open={billOpen}
          onClose={() => setBillOpen(false)}
          onExited={() => setBillTable(null)}
        />
      )}
    </div>
  )
}
