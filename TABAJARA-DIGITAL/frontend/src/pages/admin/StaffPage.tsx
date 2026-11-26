import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Check,
  ClipboardList,
  Copy,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Pencil,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { ChoiceChips, ConfirmDialog } from '../../components/admin/ConfirmDialog'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/FormControls'
import { useAdmin } from '../../hooks/useAdmin'
import { errorMessage } from '../../services/api'
import * as api from '../../services/adminService'
import { ROLE_LABEL } from '../../types/admin'
import type { StaffMember, StaffRole } from '../../types/admin'
import { cx } from '../../utils/dom'
import styles from './StaffPage.module.css'

const MIN_PASSWORD = 10
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const ROLE_OPTIONS: { value: StaffRole; label: string; icon: ReactNode }[] = [
  { value: 'garcom', label: 'Garçom', icon: <ClipboardList size={16} /> },
  { value: 'admin', label: 'Gerente', icon: <Crown size={16} /> },
]

const ROLE_HELP: Record<StaffRole, string> = {
  garcom: 'Vê chamados, pedidos e a conta das mesas, e pode fechar a conta. Não mexe em preços, cardápio, Clube nem equipe.',
  admin: 'Acesso total: faturamento, cardápio, preços, Clube, mesas, QR Codes e equipe.',
}

/** Senha fácil de ditar: sem letras parecidas (l, 1, O, 0). */
function generatePassword(length = 12) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  return Array.from(values, (v) => chars[v % chars.length]).join('')
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; member: StaffMember }
  | { kind: 'password'; member: StaffMember }
  | { kind: 'toggle'; member: StaffMember }

/** Equipe: cada garçom com o próprio login, para usar no celular dele. */
export function StaffPage() {
  const { notify } = useAdmin()
  const [staff, setStaff] = useState<StaffMember[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setStaff(await api.listStaff())
      setLoadError(null)
    } catch (err) {
      setLoadError(errorMessage(err, 'Não foi possível carregar a equipe.'))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const open = (next: DialogState) => {
    setDialog(next)
    setDialogOpen(true)
  }
  const close = () => setDialogOpen(false)
  const exited = () => setDialog(null)

  const saved = (member: StaffMember) => {
    setStaff((current) => {
      if (!current) return [member]
      const exists = current.some((m) => m.id === member.id)
      return exists ? current.map((m) => (m.id === member.id ? member : m)) : [...current, member]
    })
  }

  const active = staff?.filter((m) => m.active) ?? []
  const inactive = staff?.filter((m) => !m.active) ?? []
  const waiters = active.filter((m) => m.role === 'garcom').length
  const managers = active.length - waiters

  return (
    <div>
      <AdminPageHeader
        title="Equipe"
        subtitle={
          staff
            ? `${managers} ${managers === 1 ? 'gerente' : 'gerentes'} · ${waiters} ${waiters === 1 ? 'garçom' : 'garçons'} · cada um entra no próprio celular com o e-mail e a senha dele`
            : 'Carregando…'
        }
        actions={
          <Button variant="primary" icon={<UserPlus size={18} aria-hidden="true" />} onClick={() => open({ kind: 'create' })}>
            Cadastrar pessoa
          </Button>
        }
      />

      <div className={styles.roles}>
        <div className={styles.roleCard}>
          <span className={styles.roleIcon} aria-hidden="true">
            <ClipboardList size={18} />
          </span>
          <div>
            <strong>Garçom</strong>
            <p>{ROLE_HELP.garcom}</p>
          </div>
        </div>
        <div className={styles.roleCard}>
          <span className={cx(styles.roleIcon, styles.roleIconGold)} aria-hidden="true">
            <Crown size={18} />
          </span>
          <div>
            <strong>Gerente</strong>
            <p>{ROLE_HELP.admin}</p>
          </div>
        </div>
      </div>

      {loadError && (
        <p className={styles.error} role="alert">
          {loadError}{' '}
          <button type="button" className={styles.retry} onClick={() => void load()}>
            Tentar de novo
          </button>
        </p>
      )}

      <ul className={styles.list} aria-label="Pessoas ativas">
        {active.map((member) => (
          <MemberCard key={member.id} member={member} onAction={open} />
        ))}
      </ul>

      {inactive.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Desativados</h2>
          <p className={styles.sectionHint}>Não conseguem entrar. Ficam aqui para manter o histórico de quem atendeu cada mesa.</p>
          <ul className={styles.list} aria-label="Pessoas desativadas">
            {inactive.map((member) => (
              <MemberCard key={member.id} member={member} onAction={open} />
            ))}
          </ul>
        </>
      )}

      {dialog?.kind === 'create' && (
        <MemberFormDialog open={dialogOpen} onClose={close} onExited={exited} onSaved={saved} notify={notify} />
      )}
      {dialog?.kind === 'edit' && (
        <MemberFormDialog
          member={dialog.member}
          open={dialogOpen}
          onClose={close}
          onExited={exited}
          onSaved={saved}
          notify={notify}
        />
      )}
      {dialog?.kind === 'password' && (
        <PasswordDialog
          member={dialog.member}
          open={dialogOpen}
          onClose={close}
          onExited={exited}
          onSaved={saved}
          notify={notify}
        />
      )}
      {dialog?.kind === 'toggle' && (
        <ToggleDialog
          member={dialog.member}
          open={dialogOpen}
          onClose={close}
          onExited={exited}
          onSaved={saved}
          notify={notify}
        />
      )}
    </div>
  )
}

function MemberCard({ member, onAction }: { member: StaffMember; onAction: (d: DialogState) => void }) {
  return (
    <li className={cx(styles.card, !member.active && styles.cardOff)}>
      <span className={cx(styles.avatar, member.role === 'admin' && styles.avatarGold)} aria-hidden="true">
        {initials(member.name) || '?'}
      </span>
      <div className={styles.info}>
        <span className={styles.name}>
          {member.name}
          {member.is_me && <span className={styles.me}>você</span>}
        </span>
        <span className={styles.email}>{member.email}</span>
        <span className={styles.tags}>
          <span className={cx(styles.tag, member.role === 'admin' && styles.tagGold)}>{ROLE_LABEL[member.role] ?? member.role}</span>
          {!member.active && <span className={cx(styles.tag, styles.tagOff)}>Desativado</span>}
          {member.locked && (
            <span className={cx(styles.tag, styles.tagWarn)} title="Muitas senhas erradas. Libera em 15 minutos ou com uma senha nova.">
              <Lock size={12} aria-hidden="true" /> Bloqueado
            </span>
          )}
        </span>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          onClick={() => onAction({ kind: 'edit', member })}
          aria-label={`Editar ${member.name}`}
          title="Editar"
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          className={styles.action}
          onClick={() => onAction({ kind: 'password', member })}
          aria-label={`Nova senha para ${member.name}`}
          title="Nova senha"
        >
          <KeyRound size={16} />
        </button>
        {!member.is_me && (
          <button
            type="button"
            className={cx(styles.action, member.active ? styles.actionDanger : styles.actionGood)}
            onClick={() => onAction({ kind: 'toggle', member })}
            aria-label={member.active ? `Desativar ${member.name}` : `Reativar ${member.name}`}
            title={member.active ? 'Desativar' : 'Reativar'}
          >
            {member.active ? <UserX size={16} /> : <UserCheck size={16} />}
          </button>
        )}
      </div>
    </li>
  )
}

interface DialogProps {
  open: boolean
  onClose: () => void
  onExited: () => void
  onSaved: (member: StaffMember) => void
  notify: ReturnType<typeof useAdmin>['notify']
}

function PasswordInput({
  id,
  value,
  onChange,
  autoFocus,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={styles.passwordRow}>
      <div className={styles.passwordBox}>
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          autoCapitalize="off"
          spellCheck={false}
          value={value}
          maxLength={128}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={`${id}-dica`}
        />
        <button
          type="button"
          className={styles.eye}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Esconder senha' : 'Mostrar senha'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <button
        type="button"
        className={styles.generate}
        onClick={() => {
          onChange(generatePassword())
          setVisible(true)
        }}
      >
        <Sparkles size={15} aria-hidden="true" /> Gerar
      </button>
    </div>
  )
}

/** Tela final: os dados para passar ao funcionário (a senha não aparece de novo). */
function Credentials({ title, sub, email, password, onDone }: { title: string; sub: string; email: string; password: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Painel Tabajara\nE-mail: ${email}\nSenha: ${password}`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <>
      <span className={styles.doneIcon} aria-hidden="true">
        <svg viewBox="0 0 52 52" width="40" height="40">
          <path d="M14 27.5 L22.5 36 L39 18" />
        </svg>
      </span>
      <strong className={styles.doneTitle}>{title}</strong>
      <span className={styles.doneSub}>{sub}</span>
      <dl className={styles.credentials}>
        <div>
          <dt>E-mail</dt>
          <dd>{email}</dd>
        </div>
        <div>
          <dt>Senha</dt>
          <dd className={styles.secret}>{password}</dd>
        </div>
      </dl>
      <p className={styles.doneHint}>Anote ou copie agora: por segurança, a senha não aparece de novo.</p>
      <div className={styles.doneActions}>
        <button type="button" className={styles.copyButton} onClick={() => void copy()}>
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
        <button type="button" className={styles.doneButton} onClick={onDone}>
          Concluir
        </button>
      </div>
    </>
  )
}

function MemberFormDialog({ member, open, onClose, onExited, onSaved, notify }: DialogProps & { member?: StaffMember }) {
  const editing = Boolean(member)
  const [name, setName] = useState(member?.name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<StaffRole>(member?.role ?? 'garcom')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<StaffMember | null>(null)

  const cleanName = name.trim().replace(/\s+/g, ' ')
  const cleanEmail = email.trim().toLowerCase()
  const changed = !member || cleanName !== member.name || cleanEmail !== member.email || role !== member.role
  const valid =
    cleanName.length >= 2 && EMAIL_RE.test(cleanEmail) && (editing || password.trim().length >= MIN_PASSWORD) && changed

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      if (member) {
        const patch: Parameters<typeof api.updateStaff>[1] = {}
        if (cleanName !== member.name) patch.name = cleanName
        if (cleanEmail !== member.email) patch.email = cleanEmail
        if (role !== member.role) patch.role = role
        const updated = await api.updateStaff(member.id, patch)
        onSaved(updated)
        notify(`${updated.name} · ${ROLE_LABEL[updated.role]}`, { title: 'Cadastro atualizado' })
        onClose()
      } else {
        const result = await api.createStaff({ name: cleanName, email: cleanEmail, password: password.trim(), role })
        onSaved(result)
        notify(`${result.name} já pode entrar no painel`, { title: `${ROLE_LABEL[result.role]} cadastrado` })
        setCreated(result)
      }
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar.'))
    } finally {
      setBusy(false)
    }
  }

  const success = created ? (
    <Credentials
      title={`${created.name.split(' ')[0]} cadastrado`}
      sub={`Passe estes dados para ${created.role === 'admin' ? 'o novo gerente' : 'o garçom'} entrar no celular dele`}
      email={created.email}
      password={password.trim()}
      onDone={onClose}
    />
  ) : undefined

  const pwHint =
    password.length > 0 && password.trim().length < MIN_PASSWORD
      ? `Faltam ${MIN_PASSWORD - password.trim().length} caracteres`
      : `Mínimo de ${MIN_PASSWORD} caracteres. Use "Gerar" para criar uma senha forte.`

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onExited={onExited}
      tone="gold"
      icon={editing ? <Pencil size={22} strokeWidth={1.7} /> : <UserPlus size={24} strokeWidth={1.7} />}
      eyebrow="Equipe"
      title={editing ? `Editar ${member?.name.split(' ')[0]}` : 'Cadastrar pessoa'}
      description={editing ? 'A senha não muda aqui. Para trocar, use o botão da chave.' : 'Cada pessoa entra com o próprio e-mail e senha.'}
      confirmLabel={editing ? 'Salvar' : 'Cadastrar'}
      confirmIcon={<Check size={18} strokeWidth={2.6} />}
      busy={busy}
      canConfirm={valid}
      onConfirm={() => void submit()}
      success={success}
    >
      <form className={styles.form} onSubmit={(e: FormEvent) => void submit(e)} noValidate>
        <Field label="Nome" htmlFor="staff-nome">
          <Input
            id="staff-nome"
            value={name}
            maxLength={80}
            autoComplete="off"
            autoFocus={!editing}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: João Silva"
          />
        </Field>
        <Field label="E-mail (usado para entrar)" htmlFor="staff-email">
          <Input
            id="staff-email"
            type="email"
            inputMode="email"
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            value={email}
            maxLength={254}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="joao@email.com"
          />
        </Field>
        {!editing && (
          <Field label="Senha" htmlFor="staff-senha" hint={pwHint}>
            <PasswordInput id="staff-senha" value={password} onChange={setPassword} />
          </Field>
        )}
        {member?.is_me ? (
          <p className={styles.note}>
            <ShieldCheck size={16} aria-hidden="true" /> Você é gerente. Para mudar o seu próprio perfil, peça a outro gerente.
          </p>
        ) : (
          <>
            <ChoiceChips label="Perfil" options={ROLE_OPTIONS} value={role} onChange={(v) => v && setRole(v)} />
            <p className={styles.roleHelp}>{ROLE_HELP[role]}</p>
          </>
        )}
        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}
        <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
      </form>
    </ConfirmDialog>
  )
}

function PasswordDialog({ member, open, onClose, onExited, onSaved, notify }: DialogProps & { member: StaffMember }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const valid = password.trim().length >= MIN_PASSWORD

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      const updated = await api.resetStaffPassword(member.id, password.trim())
      onSaved(updated)
      notify(member.is_me ? 'Sua senha foi trocada' : `${member.name} precisa entrar de novo com a senha nova`, {
        title: 'Senha trocada',
      })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível trocar a senha.'))
    } finally {
      setBusy(false)
    }
  }

  const success = done ? (
    <Credentials
      title="Senha trocada"
      sub={member.is_me ? 'Use a senha nova no próximo login' : `O login antigo de ${member.name.split(' ')[0]} foi encerrado`}
      email={member.email}
      password={password.trim()}
      onDone={onClose}
    />
  ) : undefined

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onExited={onExited}
      tone="gold"
      icon={<KeyRound size={22} strokeWidth={1.7} />}
      eyebrow={member.name}
      title="Nova senha"
      description={
        member.is_me
          ? 'Escolha a sua nova senha.'
          : 'Para quando a pessoa esqueceu a senha ou ficou bloqueada. O celular dela sai do painel e precisa entrar com a senha nova.'
      }
      confirmLabel="Trocar senha"
      confirmIcon={<KeyRound size={18} />}
      busy={busy}
      canConfirm={valid}
      onConfirm={() => void submit()}
      success={success}
    >
      <form className={styles.form} onSubmit={(e: FormEvent) => void submit(e)} noValidate>
        <Field
          label="Senha nova"
          htmlFor="staff-nova-senha"
          hint={
            password.length > 0 && !valid
              ? `Faltam ${MIN_PASSWORD - password.trim().length} caracteres`
              : `Mínimo de ${MIN_PASSWORD} caracteres`
          }
        >
          <PasswordInput id="staff-nova-senha" value={password} onChange={setPassword} autoFocus />
        </Field>
        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}
        <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
      </form>
    </ConfirmDialog>
  )
}

function ToggleDialog({ member, open, onClose, onExited, onSaved, notify }: DialogProps & { member: StaffMember }) {
  const [busy, setBusy] = useState(false)
  const deactivating = member.active
  const first = member.name.split(' ')[0]

  const confirm = async () => {
    setBusy(true)
    try {
      const updated = await api.updateStaff(member.id, { active: !member.active })
      onSaved(updated)
      notify(
        deactivating ? `${first} não consegue mais entrar no painel` : `${first} já pode entrar de novo`,
        { title: deactivating ? 'Acesso desativado' : 'Acesso reativado', kind: deactivating ? 'info' : 'success' },
      )
      onClose()
    } catch (err) {
      notify(errorMessage(err, 'Não foi possível alterar o acesso.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onExited={onExited}
      tone={deactivating ? 'danger' : 'gold'}
      icon={deactivating ? <UserX size={24} strokeWidth={1.7} /> : <UserCheck size={24} strokeWidth={1.7} />}
      eyebrow={ROLE_LABEL[member.role]}
      title={deactivating ? `Desativar ${first}?` : `Reativar ${first}?`}
      description={
        deactivating ? (
          <>
            {member.name} sai do painel na hora, em qualquer celular, e não consegue mais entrar. O histórico de chamados,
            contas e pedidos continua guardado. Dá para reativar depois.
          </>
        ) : (
          <>{member.name} volta a entrar com o mesmo e-mail e a mesma senha de antes.</>
        )
      }
      confirmLabel={deactivating ? 'Desativar' : 'Reativar'}
      confirmIcon={deactivating ? <UserX size={18} /> : <UserCheck size={18} />}
      busy={busy}
      onConfirm={() => void confirm()}
    />
  )
}
