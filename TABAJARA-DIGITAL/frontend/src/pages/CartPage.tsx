import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Armchair,
  ArrowRight,
  Cake,
  Check,
  Gift,
  Loader2,
  MessageSquare,
  Plus,
  QrCode,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Undo2,
  User,
  Wallet,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { CartItemList } from '../components/cart/CartItemList'
import { CartSuggestions } from '../components/cart/CartSuggestions'
import { TablePicker } from '../components/cart/TablePicker'
import { ClubPerks } from '../components/cart/ClubPerks'
import { RewardLines } from '../components/cart/RewardLines'
import { Money, Points } from '../components/ui/Money'
import { ClubCheckout } from '../components/club/ClubCheckout'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Field, Input, TextArea } from '../components/ui/FormControls'
import { useCart } from '../hooks/useCart'
import { useClubCart } from '../hooks/useClubCart'
import { useClubRules } from '../hooks/useClubRules'
import { useCountUp } from '../hooks/useCountUp'
import { useCustomer } from '../hooks/useCustomer'
import { usePointsEstimate } from '../hooks/usePointsEstimate'
import { ApiError, errorMessage } from '../services/api'
import { getMenu } from '../services/menuService'
import { createOrder, getTables } from '../services/orderService'
import type { CartItem } from '../types/cart'
import type { Category, Product } from '../types/menu'
import type { PublicTable } from '../types/order'
import { cx } from '../utils/dom'
import { flyToCart } from '../utils/flyToCart'
import { readSessionJSON, STORAGE_KEYS, writeJSON, writeSessionJSON } from '../utils/storage'
import { clearQrTable, formatTable, readQrTable } from '../utils/tableSession'
import styles from './CartPage.module.css'

interface SavedCustomer {
  name: string
  table: string
}

interface Notice {
  id: number
  text: string
  undo?: CartItem
}

const NOTES_MAX = 300
/** Linhas de itens mostradas na comanda; o resto vira "+ N itens". */
const RECEIPT_LINES = 5
const FORM_ID = 'pedido-form'

/** Página do carrinho: revisar itens, Clube, nome e mesa, e enviar o pedido para a cozinha. */
export function CartPage() {
  const navigate = useNavigate()
  const { items, count, totalCents, add, remove, clear, syncWithMenu } = useCart()
  // Nome e mesa ficam só nesta visita (aba): o próximo cliente do aparelho não vê o nome anterior.
  const [saved] = useState(() => readSessionJSON<SavedCustomer | null>(STORAGE_KEYS.customer, null))
  const { customer, token: customerToken, confirmIdentity } = useCustomer()
  const rules = useClubRules()
  const estimate = usePointsEstimate(items, Boolean(rules?.enabled))

  // Mesa vinda do QR Code tem prioridade: o cliente não precisa escolher.
  const [qrTable, setQrTable] = useState(() => readQrTable())
  const [name, setName] = useState(saved?.name ?? (confirmIdentity ? '' : customer?.name.split(' ')[0]) ?? '')
  const [table, setTable] = useState(qrTable ? String(qrTable.number) : (saved?.table ?? ''))
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [tables, setTables] = useState<PublicTable[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [errors, setErrors] = useState<{ name?: string; table?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const perks = useClubCart()
  const clubActive = Boolean(customer) && !confirmIdentity
  const hasPerks = clubActive && perks.perksCount > 0
  const hasUnavailable = items.some((item) => !item.product.available)
  const nameOk = name.trim().length >= 2
  const tableOk = Boolean(table)
  const animatedTotal = useCountUp(totalCents, true, 650)
  const pointsForCustomer = customer && estimate && !confirmIdentity ? estimate : 0

  useEffect(() => {
    document.title = 'Carrinho · Tabajara'
    writeJSON(STORAGE_KEYS.customer, null) // limpa o nome salvo por versões anteriores
  }, [])

  // "Não sou eu" / saiu do Clube: tira o nome da conta anterior do campo.
  const previousCustomer = useRef(customer)
  useEffect(() => {
    const before = previousCustomer.current
    previousCustomer.current = customer
    if (before && !customer) setName((current) => (current === before.name.split(' ')[0] ? '' : current))
  }, [customer])

  // Lista de mesas e cardápio atualizado (preços, disponibilidade e sugestões).
  useEffect(() => {
    const controller = new AbortController()
    getTables(controller.signal)
      .then(setTables)
      .catch(() => setTables([])) // sem a lista, o cliente digita o número
    getMenu(controller.signal)
      .then((menu) => {
        setCategories(menu.categories)
        syncWithMenu(menu.categories.flatMap((category) => category.products))
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [syncWithMenu])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), notice.undo ? 5000 : 2600)
    return () => window.clearTimeout(timer)
  }, [notice])

  // ---------- Itens ----------
  const handleRemove = useCallback(
    (productId: string) => {
      const removed = items.find((item) => item.product.id === productId)
      remove(productId)
      if (removed) setNotice({ id: Date.now(), text: `${removed.product.name} removido`, undo: removed })
    },
    [items, remove],
  )

  const undoRemove = () => {
    if (!notice?.undo) return
    add(notice.undo.product, notice.undo.quantity)
    setNotice(null)
  }

  const addSuggestion = (product: Product, source: HTMLElement | null) => {
    void flyToCart(source)
    add(product, 1)
    setNotice({ id: Date.now(), text: `${product.name} adicionado` })
  }

  // ---------- Envio ----------
  const validate = () => {
    const next: typeof errors = {}
    if (!nameOk) next.name = 'Informe seu nome.'
    const tableNumber = Number(table)
    if (!table || !Number.isInteger(tableNumber) || tableNumber < 1) next.table = 'Escolha o número da sua mesa.'
    setErrors(next)
    // leva o cliente direto ao primeiro campo que falta (útil no celular, com a barra fixa)
    const first = next.name ? 'pedido-nome' : next.table ? 'pedido-mesa' : null
    if (first) {
      const field = document.getElementById(first)
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      window.setTimeout(() => field?.focus({ preventScroll: true }), 350)
    }
    return !first
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitError(null)
    // Conta salva no aparelho ainda não confirmada: não envia na conta de outra pessoa.
    if (confirmIdentity) {
      setSubmitError('Antes de enviar, confirme se você é o titular da conta do Clube conectada neste aparelho.')
      document.getElementById('confirmar-identidade')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!validate() || sending || hasUnavailable) return

    setSending(true)
    try {
      const order = await createOrder(
        {
          customer_name: name.trim(),
          table_number: Number(table),
          notes: notes.trim() || null,
          items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
          rewards: hasPerks ? perks.rewards.map((l) => ({ reward_id: l.reward.id, quantity: l.quantity })) : [],
          birthday_gift: hasPerks && perks.birthdayGift,
        },
        customerToken,
      )
      writeSessionJSON(STORAGE_KEYS.customer, { name: name.trim(), table })
      writeJSON(STORAGE_KEYS.lastOrder, order.code)
      clear()
      perks.clearPerks()
      perks.refreshBalance()
      perks.refreshBirthday()
      navigate(`/pedido/${order.code}`, { replace: true })
    } catch (error) {
      setSubmitError(errorMessage(error, 'Não foi possível enviar o pedido. Tente novamente.'))
      // Item ficou indisponível ou foi removido: atualiza o carrinho para o cliente ver.
      if (error instanceof ApiError && (error.status === 409 || error.status === 422)) {
        perks.refreshBalance()
        perks.refreshBirthday()
        getMenu()
          .then((menu) => syncWithMenu(menu.categories.flatMap((category) => category.products)))
          .catch(() => undefined)
      }
    } finally {
      setSending(false)
    }
  }

  // ---------- Carrinho vazio ----------
  if (items.length === 0 && !hasPerks) {
    return (
      <>
        <PageHeader cartCurrent />
        <main className={styles.emptyPage}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <ShoppingBag size={34} strokeWidth={1.25} />
          </span>
          <h1 className={styles.emptyTitle}>Seu carrinho está vazio</h1>
          <p className={styles.emptyText}>Escolha seus pratos no cardápio e volte aqui para finalizar o pedido.</p>
          <Link to="/cardapio" className={styles.emptyLink}>
            Ver o cardápio <ArrowRight size={16} aria-hidden="true" />
          </Link>
          {notice?.undo && (
            <button type="button" className={styles.emptyUndo} onClick={undoRemove}>
              <Undo2 size={16} aria-hidden="true" /> Desfazer: {notice.undo.product.name}
            </button>
          )}
        </main>
      </>
    )
  }

  const totalCount = count + (hasPerks ? perks.perksCount : 0)
  const readyData = nameOk && tableOk

  const submitButton = (
    <Button
      type="submit"
      form={FORM_ID}
      variant="primary"
      block
      disabled={sending || hasUnavailable}
      className={styles.submit}
      icon={
        sending ? (
          <Loader2 size={18} className={styles.spin} aria-hidden="true" />
        ) : (
          <Send size={18} strokeWidth={1.75} aria-hidden="true" />
        )
      }
    >
      {sending ? 'Enviando…' : 'Enviar pedido'}
    </Button>
  )

  return (
    <>
      <PageHeader cartCurrent />

      <main className={styles.page}>
        {/* Cabeçalho */}
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Seu pedido</p>
          <h1 className={styles.title}>Carrinho</h1>
          <p className={styles.heroMeta}>
            <span>
              {totalCount} {totalCount === 1 ? 'item' : 'itens'}
            </span>
            <span className={styles.heroDot} aria-hidden="true" />
            <span>
              <Money cents={totalCents} variant="plain" />
            </span>
            {qrTable && (
              <>
                <span className={styles.heroDot} aria-hidden="true" />
                <span className={styles.heroTable}>
                  <QrCode size={14} aria-hidden="true" />
                  {formatTable(qrTable.number)}
                </span>
              </>
            )}
          </p>
        </header>

        <div className={styles.layout}>
          {/* ---------- Passos ---------- */}
          <div className={styles.mainCol}>
            <section className={styles.panel} aria-labelledby="itens-titulo">
              <header className={styles.panelHead}>
                <span className={styles.step} aria-hidden="true">
                  1
                </span>
                <div className={styles.panelHeading}>
                  <h2 id="itens-titulo" className={styles.panelTitle}>
                    Itens
                  </h2>
                  <p className={styles.panelSub}>Ajuste as quantidades ou remova o que não quiser.</p>
                </div>
                <Link to="/cardapio" className={styles.headLink}>
                  <Plus size={15} aria-hidden="true" /> Adicionar
                </Link>
              </header>
              {items.length > 0 && <CartItemList variant="cards" onRemove={handleRemove} />}
              {hasPerks && <RewardLines firstNoBorder={items.length === 0} />}
              {hasUnavailable && (
                <p className={styles.alert} role="alert">
                  Há itens indisponíveis no carrinho. Remova-os para enviar o pedido.
                </p>
              )}
              <CartSuggestions categories={categories} onAdd={addSuggestion} embedded />
            </section>

            {clubActive && <ClubPerks firstName={customer?.name.split(' ')[0] ?? ''} />}

            <section className={styles.panel} aria-labelledby="dados-titulo">
              <form id={FORM_ID} ref={formRef} onSubmit={handleSubmit} noValidate>
                <header className={styles.panelHead}>
                  <span className={cx(styles.step, readyData && styles.stepDone)} aria-hidden="true">
                    {readyData ? <Check size={13} strokeWidth={3} /> : 2}
                  </span>
                  <div className={styles.panelHeading}>
                    <h2 id="dados-titulo" className={styles.panelTitle}>
                      Seus dados
                    </h2>
                    <p className={styles.panelSub}>Para a equipe saber de quem é o pedido e onde servir.</p>
                  </div>
                </header>

                <div className={styles.fields}>
                  <Field label="Seu nome" htmlFor="pedido-nome" error={errors.name}>
                    <div className={styles.withIcon}>
                      <User size={18} strokeWidth={1.5} className={styles.fieldIcon} aria-hidden="true" />
                      <Input
                        id="pedido-nome"
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value)
                          setErrors((current) => ({ ...current, name: undefined }))
                        }}
                        autoComplete="given-name"
                        maxLength={60}
                        placeholder="Seu primeiro nome"
                        aria-invalid={Boolean(errors.name)}
                      />
                    </div>
                  </Field>

                  {qrTable ? (
                    <div className={styles.qrTable}>
                      <span className={styles.qrIcon} aria-hidden="true">
                        <QrCode size={18} strokeWidth={1.75} />
                      </span>
                      <span className={styles.qrText}>
                        <strong>{formatTable(qrTable.number)}</strong>
                        <span>{qrTable.label ? `${qrTable.label} · ` : ''}identificada pelo QR Code</span>
                      </span>
                      <button
                        type="button"
                        className={styles.qrChange}
                        onClick={() => {
                          clearQrTable()
                          setQrTable(null)
                          setTable('')
                        }}
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <Field
                      label="Mesa"
                      htmlFor="pedido-mesa"
                      error={errors.table}
                      hint="O número está na placa sobre a mesa."
                    >
                      {tables && tables.length > 0 ? (
                        <TablePicker
                          id="pedido-mesa"
                          tables={tables}
                          value={table}
                          invalid={Boolean(errors.table)}
                          onChange={(value) => {
                            setTable(value)
                            setErrors((current) => ({ ...current, table: undefined }))
                          }}
                        />
                      ) : (
                        <div className={styles.withIcon}>
                          <Armchair size={18} strokeWidth={1.5} className={styles.fieldIcon} aria-hidden="true" />
                          <Input
                            id="pedido-mesa"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={999}
                            value={table}
                            onChange={(event) => {
                              setTable(event.target.value)
                              setErrors((current) => ({ ...current, table: undefined }))
                            }}
                            placeholder={tables === null ? 'Carregando mesas…' : 'Número da mesa'}
                            aria-invalid={Boolean(errors.table)}
                          />
                        </div>
                      )}
                    </Field>
                  )}

                  {showNotes || notes ? (
                    <Field
                      label="Observações"
                      htmlFor="pedido-obs"
                      counter={`${notes.length}/${NOTES_MAX}`}
                      hint="Ex.: picanha ao ponto, sem cebola, trazer a bebida antes."
                      className={styles.notesField}
                    >
                      <div className={cx(styles.withIcon, styles.withIconTop)}>
                        <MessageSquare size={18} strokeWidth={1.5} className={styles.fieldIcon} aria-hidden="true" />
                        <TextArea
                          id="pedido-obs"
                          value={notes}
                          onChange={(event) => setNotes(event.target.value.slice(0, NOTES_MAX))}
                          rows={3}
                          placeholder="Opcional"
                          autoFocus={showNotes && !notes}
                        />
                      </div>
                    </Field>
                  ) : (
                    <button type="button" className={styles.addNotes} onClick={() => setShowNotes(true)}>
                      <MessageSquare size={16} aria-hidden="true" />
                      Adicionar observação <span>(ponto da carne, sem cebola…)</span>
                    </button>
                  )}
                </div>
              </form>
            </section>

            <ClubCheckout
              typedName={name}
              estimate={estimate}
              onLoggedIn={(c) => {
                if (name.trim().length < 2) setName(c.name.split(' ')[0])
              }}
            />
          </div>

          {/* ---------- Comanda (resumo) ---------- */}
          <aside className={styles.side}>
            <section className={styles.receipt} aria-labelledby="resumo-titulo">
              <header className={styles.receiptHead}>
                <span className={styles.step} aria-hidden="true">
                  3
                </span>
                <h2 id="resumo-titulo" className={styles.panelTitle}>
                  Resumo
                </h2>
                <span className={styles.receiptCount}>
                  {totalCount} {totalCount === 1 ? 'item' : 'itens'}
                </span>
              </header>

              <ul className={styles.receiptLines}>
                {items.slice(0, RECEIPT_LINES).map(({ product, quantity }) => (
                  <li key={product.id}>
                    <span className={styles.receiptQty}>{quantity}×</span>
                    <span className={styles.receiptName}>{product.name}</span>
                    <span className={styles.receiptPrice}>
                      <Money cents={product.price_cents * quantity} variant="plain" />
                    </span>
                  </li>
                ))}
                {items.length > RECEIPT_LINES && (
                  <li className={styles.receiptMore}>
                    + {items.length - RECEIPT_LINES} {items.length - RECEIPT_LINES === 1 ? 'item' : 'itens'}
                  </li>
                )}
              </ul>

              <div className={styles.perforation} aria-hidden="true" />

              <dl className={styles.summary}>
                <div className={styles.summaryRow}>
                  <dt>Subtotal</dt>
                  <dd>
                    <Money cents={totalCents} variant="plain" />
                  </dd>
                </div>
                {hasPerks && perks.pointsCost > 0 && (
                  <div className={styles.summaryRow}>
                    <dt>
                      <Gift size={14} aria-hidden="true" /> Resgates com pontos
                    </dt>
                    <dd className={styles.gold}>
                      <Points value={-perks.pointsCost} signed />
                    </dd>
                  </div>
                )}
                {hasPerks && perks.birthdayGift && (
                  <div className={styles.summaryRow}>
                    <dt>
                      <Cake size={14} aria-hidden="true" /> Presente de aniversário
                    </dt>
                    <dd className={styles.gold}>Grátis</dd>
                  </div>
                )}
                {pointsForCustomer > 0 && (
                  <div className={styles.summaryRow}>
                    <dt>
                      <Sparkles size={14} aria-hidden="true" /> Você ganha
                    </dt>
                    <dd className={styles.gold}>
                      <Points value={pointsForCustomer} signed />
                    </dd>
                  </div>
                )}
              </dl>

              <div className={styles.totalRow}>
                <span>Total</span>
                <span className={styles.total}>
                  <Money cents={animatedTotal} />
                </span>
              </div>

              {submitError && (
                <p className={styles.alert} role="alert">
                  {submitError}
                </p>
              )}

              <div className={styles.desktopSubmit}>{submitButton}</div>

              <ul className={styles.notes}>
                <li>
                  <ShieldCheck size={15} strokeWidth={1.75} aria-hidden="true" />
                  Vai direto para a cozinha.
                </li>
                <li>
                  <Wallet size={15} strokeWidth={1.75} aria-hidden="true" />
                  Pagamento no caixa ou com o atendente, no final.
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </main>

      {/* Celular: total e botão sempre visíveis na parte de baixo */}
      <div className={styles.mobileBar}>
        <div className={styles.mobileTotal}>
          <span>Total</span>
          <strong>
            <Money cents={animatedTotal} />
          </strong>
          {pointsForCustomer > 0 && (
            <em>
              <Points value={pointsForCustomer} signed />
            </em>
          )}
        </div>
        <div className={styles.mobileButton}>{submitButton}</div>
      </div>

      {/* Aviso com "Desfazer" */}
      <div className={styles.noticeRegion} role="status" aria-live="polite">
        {notice && (
          <div key={notice.id} className={styles.notice}>
            <span>{notice.text}</span>
            {notice.undo && (
              <button type="button" onClick={undoRemove} className={styles.undo}>
                <Undo2 size={15} aria-hidden="true" /> Desfazer
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
