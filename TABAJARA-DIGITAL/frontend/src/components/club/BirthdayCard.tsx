import { useState } from 'react'
import type { FormEvent } from 'react'
import { Cake, Gift } from 'lucide-react'

import { useClubCart } from '../../hooks/useClubCart'
import { errorMessage } from '../../services/api'
import { setBirthday } from '../../services/clubService'
import { cx } from '../../utils/dom'
import { BirthdayPicker, MONTHS } from './BirthdayPicker'
import styles from './BirthdayCard.module.css'


/** Presente de aniversário na área do Clube: informar a data (uma vez) e ver se o presente está liberado. */
export function BirthdayCard({ onUse }: { onUse?: () => void }) {
  const { birthday, refreshBirthday, setBirthdayGift } = useClubCart()
  const [day, setDay] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!birthday?.enabled || !birthday.product) return null
  const product = birthday.product

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (day === null || month === null) return setError('Escolha o dia e o mês.')
    setBusy(true)
    try {
      await setBirthday(day, month, null)
      refreshBirthday()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="aniversario"
      className={cx(styles.card, birthday.eligible && styles.party)}
      aria-labelledby="aniv-titulo"
    >
      <span className={styles.icon} aria-hidden="true">
        <Cake size={22} strokeWidth={1.6} />
      </span>
      <div className={styles.body}>
        <p className={styles.eyebrow}>Presente de aniversário</p>
        {birthday.eligible ? (
          <>
            <h2 id="aniv-titulo" className={styles.title}>
              Feliz aniversário!
            </h2>
            <p className={styles.text}>
              Este mês o <strong>{product.name}</strong> é por nossa conta. Adicione ao seu próximo pedido.
            </p>
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                setBirthdayGift(true)
                onUse?.()
              }}
            >
              <Gift size={16} aria-hidden="true" /> Usar no pedido
            </button>
          </>
        ) : birthday.has_date ? (
          <>
            <h2 id="aniv-titulo" className={styles.title}>
              {String(birthday.day).padStart(2, '0')} de {MONTHS[(birthday.month ?? 1) - 1]}
            </h2>
            <p className={styles.text}>
              {birthday.used_this_year
                ? 'Seu presente deste ano já foi usado. Até o próximo aniversário!'
                : birthday.available_from
                  ? `No mês do seu aniversário você ganha ${product.name}. Liberado a partir de ${new Date(birthday.available_from).toLocaleDateString('pt-BR')}.`
                  : `No mês do seu aniversário você ganha ${product.name}, uma vez por ano.`}
            </p>
          </>
        ) : (
          <>
            <h2 id="aniv-titulo" className={styles.title}>
              Ganhe {product.name}
            </h2>
            <p className={styles.text}>
              Informe seu aniversário e ganhe um presente no seu mês. A data só pode ser informada uma vez; para
              corrigir, fale com a equipe.
            </p>
            <form className={styles.form} onSubmit={save} noValidate>
              <BirthdayPicker
                day={day}
                month={month}
                disabled={busy}
                onChange={(d, m) => {
                  setDay(d)
                  setMonth(m)
                  setError(null)
                }}
              />
              <button type="submit" className={styles.primary} disabled={busy}>
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
            </form>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
