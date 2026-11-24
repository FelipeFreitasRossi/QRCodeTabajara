import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/FormControls'
import { Logo } from '../../components/ui/Logo'
import { Ornament } from '../../components/ui/Ornament'
import { useAuth } from '../../hooks/useAuth'
import { errorMessage } from '../../services/api'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const { admin, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = 'Entrar · Painel Tabajara'
  }, [])

  const from = (location.state as { from?: string } | null)?.from ?? '/admin'
  if (admin) return <Navigate to={from} replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível entrar. Tente novamente.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <div className={styles.head}>
          <Logo size="md" />
          <span className={styles.tag}>Painel administrativo</span>
          <Ornament className={styles.ornament} />
        </div>

        <Field label="E-mail" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@restaurante.com"
            autoFocus
          />
        </Field>

        <Field label="Senha" htmlFor="login-senha">
          <div className={styles.passwordWrap}>
            <Input
              id="login-senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={styles.passwordInput}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" block disabled={loading} icon={<Lock size={16} aria-hidden="true" />}>
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </main>
  )
}
