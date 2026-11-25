import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, KeyRound, LogIn, Mail, Phone, ShieldCheck, User, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useCustomer } from '../../hooks/useCustomer'
import { ApiError, errorMessage } from '../../services/api'
import type { Customer } from '../../types/club'
import { cx } from '../../utils/dom'
import { isValidCpf, maskCpf, maskPhone, onlyDigits } from '../../utils/format'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/FormControls'
import { BirthdayPicker } from './BirthdayPicker'
import styles from './ClubAuthForm.module.css'

export type AuthMode = 'login' | 'register'


interface ClubAuthFormProps {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onSuccess: (customer: Customer, mode: AuthMode) => void
  /** Nome já digitado no carrinho, para não pedir duas vezes. */
  initialName?: string
  compact?: boolean
}

type Errors = Partial<Record<'name' | 'cpf' | 'phone' | 'email' | 'pin' | 'pin2' | 'privacy' | 'birth', string>>

/** Entrar (CPF + PIN) ou criar cadastro no Clube, no mesmo lugar. */
export function ClubAuthForm({ mode, onModeChange, onSuccess, initialName = '', compact = false }: ClubAuthFormProps) {
  const uid = useId()
  const { login, register } = useCustomer()
  const [name, setName] = useState(initialName)
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [remember, setRemember] = useState(false)
  const [birthDay, setBirthDay] = useState<number | null>(null)
  const [birthMonth, setBirthMonth] = useState<number | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const id = (field: string) => `${uid}-${field}`
  const clear = (field: keyof Errors) => setErrors((e) => ({ ...e, [field]: undefined }))

  const validate = (): boolean => {
    const next: Errors = {}
    if (!isValidCpf(cpf)) next.cpf = 'Confira o CPF digitado.'
    if (!/^\d{4,6}$/.test(pin)) next.pin = 'O PIN tem de 4 a 6 números.'
    if (mode === 'register') {
      if (name.trim().length < 2) next.name = 'Informe seu nome.'
      const p = onlyDigits(phone)
      if (p.length < 10 || p.length > 11) next.phone = 'Informe o celular com DDD.'
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'E-mail inválido.'
      if (/^\d{4,6}$/.test(pin) && (/^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)))
        next.pin = 'Escolha um PIN menos óbvio (evite 1234, 0000…).'
      if (pin2 !== pin) next.pin2 = 'Os PINs não são iguais.'
      if (birthDay === null || birthMonth === null) next.birth = 'Informe o dia e o mês do seu aniversário.'
      if (!privacy) next.privacy = 'Para participar, aceite o aviso de privacidade.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    event.stopPropagation() // o formulário pode estar dentro de outra tela com formulário
    setFormError(null)
    if (busy || !validate()) return
    setBusy(true)
    try {
      const customer =
        mode === 'login'
          ? await login(onlyDigits(cpf), pin, remember)
          : await register({
              name: name.trim(),
              cpf: onlyDigits(cpf),
              phone: onlyDigits(phone),
              email: email.trim() || null,
              pin,
              accept_privacy: true,
              remember,
              birth_day: birthDay as number,
              birth_month: birthMonth as number,
            })
      onSuccess(customer, mode)
    } catch (error) {
      // CPF já cadastrado: leva direto para "Entrar", mantendo o CPF digitado.
      if (error instanceof ApiError && error.status === 409 && mode === 'register') {
        onModeChange('login')
        setPin('')
        setPin2('')
      }
      setFormError(errorMessage(error, 'Não foi possível concluir. Tente novamente.'))
    } finally {
      setBusy(false)
    }
  }

  const pinType = showPin ? 'text' : 'password'

  return (
    <form className={cx(styles.form, compact && styles.compact)} onSubmit={submit} noValidate>
      <div className={styles.tabs} role="tablist" aria-label="Acesso ao Clube">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={cx(styles.tab, mode === m && styles.tabActive)}
            onClick={() => {
              onModeChange(m)
              setErrors({})
              setFormError(null)
            }}
          >
            {m === 'login' ? 'Já tenho cadastro' : 'Criar cadastro'}
          </button>
        ))}
        <span className={styles.tabIndicator} data-mode={mode} aria-hidden="true" />
      </div>

      <div className={styles.fields} key={mode}>
        {mode === 'register' && (
          <Field label="Nome" htmlFor={id('nome')} error={errors.name}>
            <div className={styles.withIcon}>
              <User size={17} className={styles.icon} aria-hidden="true" />
              <Input
                id={id('nome')}
                value={name}
                maxLength={60}
                autoComplete="name"
                onChange={(e) => {
                  setName(e.target.value)
                  clear('name')
                }}
                placeholder="Seu nome"
              />
            </div>
          </Field>
        )}

        <Field label="CPF" htmlFor={id('cpf')} error={errors.cpf}>
          <div className={styles.withIcon}>
            <ShieldCheck size={17} className={styles.icon} aria-hidden="true" />
            <Input
              id={id('cpf')}
              value={cpf}
              inputMode="numeric"
              autoComplete="off"
              onChange={(e) => {
                setCpf(maskCpf(e.target.value))
                clear('cpf')
              }}
              placeholder="000.000.000-00"
            />
          </div>
        </Field>

        {mode === 'register' && (
          <div className={styles.row}>
            <Field label="Celular" htmlFor={id('cel')} error={errors.phone}>
              <div className={styles.withIcon}>
                <Phone size={17} className={styles.icon} aria-hidden="true" />
                <Input
                  id={id('cel')}
                  value={phone}
                  inputMode="tel"
                  autoComplete="tel-national"
                  onChange={(e) => {
                    setPhone(maskPhone(e.target.value))
                    clear('phone')
                  }}
                  placeholder="(16) 99999-9999"
                />
              </div>
            </Field>
            <Field label="E-mail (opcional)" htmlFor={id('email')} error={errors.email}>
              <div className={styles.withIcon}>
                <Mail size={17} className={styles.icon} aria-hidden="true" />
                <Input
                  id={id('email')}
                  type="email"
                  value={email}
                  maxLength={120}
                  autoComplete="email"
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clear('email')
                  }}
                  placeholder="voce@email.com"
                />
              </div>
            </Field>
          </div>
        )}

        <div className={mode === 'register' ? styles.row : undefined}>
          <Field
            label={mode === 'login' ? 'PIN' : 'Crie um PIN'}
            htmlFor={id('pin')}
            error={errors.pin}
            hint={mode === 'register' ? '4 a 6 números. É a sua senha do Clube.' : undefined}
          >
            <div className={styles.withIcon}>
              <KeyRound size={17} className={styles.icon} aria-hidden="true" />
              <Input
                id={id('pin')}
                type={pinType}
                value={pin}
                inputMode="numeric"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                onChange={(e) => {
                  setPin(onlyDigits(e.target.value).slice(0, 6))
                  clear('pin')
                }}
                placeholder="••••"
                className={styles.pinInput}
              />
              <button
                type="button"
                className={styles.reveal}
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
              >
                {showPin ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            </div>
          </Field>
          {mode === 'register' && (
            <Field label="Repita o PIN" htmlFor={id('pin2')} error={errors.pin2}>
              <div className={styles.withIcon}>
                <KeyRound size={17} className={styles.icon} aria-hidden="true" />
                <Input
                  id={id('pin2')}
                  type={pinType}
                  value={pin2}
                  inputMode="numeric"
                  autoComplete="new-password"
                  onChange={(e) => {
                    setPin2(onlyDigits(e.target.value).slice(0, 6))
                    clear('pin2')
                  }}
                  placeholder="••••"
                  className={styles.pinInput}
                />
              </div>
            </Field>
          )}
        </div>

        {mode === 'register' && (
          <Field
            label="Aniversário"
            htmlFor={id('aniv')}
            error={errors.birth}
            hint="Só dia e mês. No mês do seu aniversário você ganha um presente."
          >
            <BirthdayPicker
              id={id('aniv')}
              day={birthDay}
              month={birthMonth}
              invalid={Boolean(errors.birth)}
              onChange={(d, m) => {
                setBirthDay(d)
                setBirthMonth(m)
                clear('birth')
              }}
            />
          </Field>
        )}

        {mode === 'register' && (
          <div className={styles.consent}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={privacy}
                onChange={(e) => {
                  setPrivacy(e.target.checked)
                  clear('privacy')
                }}
              />
              <span>
                Li e aceito o{' '}
                <Link to="/privacidade" target="_blank" rel="noopener">
                  aviso de privacidade
                </Link>{' '}
                do Clube Tabajara. Meus dados são usados só para o programa de pontos.
              </span>
            </label>
            {errors.privacy && (
              <p className={styles.error} role="alert">
                {errors.privacy}
              </p>
            )}
          </div>
        )}

        <label className={cx(styles.check, styles.remember)}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>
            <strong>Manter conectado neste celular</strong>
            <span className={styles.rememberHint}>
              Só marque se o celular for seu. Sem marcar, você sai ao fechar a página ou após 30 min sem uso.
            </span>
          </span>
        </label>

        {mode === 'login' && <p className={styles.help}>Esqueceu o PIN? Peça para a equipe redefinir no caixa.</p>}

        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          block
          disabled={busy}
          icon={mode === 'login' ? <LogIn size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}
        >
          {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar no Clube' : 'Criar cadastro e ganhar pontos'}
        </Button>
      </div>
    </form>
  )
}
