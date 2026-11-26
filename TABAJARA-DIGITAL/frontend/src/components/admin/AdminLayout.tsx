import {
  Armchair,
  BellRing,
  ClipboardList,
  Crown,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Tags,
  Users,
  UtensilsCrossed,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { AdminProvider } from '../../contexts/AdminProvider'
import { useAdmin } from '../../hooks/useAdmin'
import { useAuth } from '../../hooks/useAuth'
import { isManager, ROLE_LABEL } from '../../types/admin'
import { cx } from '../../utils/dom'
import { Logo } from '../ui/Logo'
import styles from './AdminLayout.module.css'

interface NavItem {
  to: string
  label: string
  short: string
  icon: typeof LayoutDashboard
  end: boolean
  /** Só o gerente vê. */
  manager?: boolean
  /** No celular fica no topo (a barra de baixo já está cheia). */
  topOnMobile?: boolean
}

const NAV: NavItem[] = [
  { to: '/admin', label: 'Painel', short: 'Painel', icon: LayoutDashboard, end: true, manager: true },
  { to: '/admin/chamados', label: 'Chamados', short: 'Chamados', icon: BellRing, end: false },
  { to: '/admin/pedidos', label: 'Pedidos', short: 'Pedidos', icon: ClipboardList, end: false },
  { to: '/admin/mesas', label: 'Mesas e QR Codes', short: 'Mesas', icon: Armchair, end: false },
  { to: '/admin/produtos', label: 'Produtos', short: 'Produtos', icon: UtensilsCrossed, end: false, manager: true },
  { to: '/admin/categorias', label: 'Categorias', short: 'Categorias', icon: Tags, end: false, manager: true },
  { to: '/admin/clube', label: 'Clube Tabajara', short: 'Clube', icon: Crown, end: false, manager: true },
  { to: '/admin/equipe', label: 'Equipe', short: 'Equipe', icon: Users, end: false, manager: true, topOnMobile: true },
]

function Shell() {
  const { admin, logout } = useAuth()
  const manager = isManager(admin)
  const nav = NAV.filter((item) => manager || !item.manager).map((item) =>
    // Para o garçom, "Mesas" é só para abrir a conta.
    !manager && item.to === '/admin/mesas' ? { ...item, label: 'Mesas e contas' } : item,
  )
  const { pendingCount, openCallsCount, soundOn, toggleSound } = useAdmin()
  const badgeFor = (to: string) =>
    to === '/admin/pedidos' ? pendingCount : to === '/admin/chamados' ? openCallsCount : 0

  const soundButton = (
    <button
      type="button"
      className={styles.iconButton}
      onClick={toggleSound}
      aria-pressed={soundOn}
      aria-label={soundOn ? 'Desativar som de pedidos e chamados' : 'Ativar som de pedidos e chamados'}
      title={soundOn ? 'Som de pedidos e chamados: ligado' : 'Som de pedidos e chamados: desligado'}
    >
      {soundOn ? <Volume2 size={18} strokeWidth={1.75} /> : <VolumeX size={18} strokeWidth={1.75} />}
    </button>
  )

  return (
    <div className={styles.shell}>
      {/* Barra lateral (computador/tablet) */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo size="sm" />
          <span className={styles.brandTag}>Painel</span>
        </div>
        <nav className={styles.nav} aria-label="Menu do painel">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cx(styles.navLink, isActive && styles.active)}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              <span>{label}</span>
              {badgeFor(to) > 0 && (
                <span
                  className={cx(styles.badge, to === '/admin/chamados' && styles.badgeCall)}
                  aria-label={`${badgeFor(to)} ${to === '/admin/chamados' ? 'abertos' : 'novos'}`}
                >
                  {badgeFor(to)}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <a href="/cardapio" target="_blank" rel="noopener noreferrer" className={styles.navLink}>
            <ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>Ver cardápio</span>
          </a>
          <div className={styles.user}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{admin?.name}</span>
              <span className={styles.userEmail}>
                {ROLE_LABEL[admin?.role ?? ''] ?? 'Equipe'} · {admin?.email}
              </span>
            </div>
            {soundButton}
            <button
              type="button"
              className={styles.iconButton}
              onClick={logout}
              aria-label="Sair do painel"
              title="Sair"
            >
              <LogOut size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* Barra superior (celular) */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <Logo size="sm" />
          <span className={styles.brandTag}>{manager ? 'Painel' : 'Garçom'}</span>
        </div>
        <div className={styles.topActions}>
          {manager && (
            <NavLink
              to="/admin/equipe"
              className={({ isActive }) => cx(styles.iconButton, isActive && styles.iconButtonOn)}
              aria-label="Equipe (garçons e gerentes)"
              title="Equipe"
            >
              <Users size={18} strokeWidth={1.75} />
            </NavLink>
          )}
          {soundButton}
          <button type="button" className={styles.iconButton} onClick={logout} aria-label="Sair do painel">
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      {/* Navegação inferior (celular) */}
      <nav className={styles.tabbar} aria-label="Menu do painel">
        {nav
          .filter((item) => !item.topOnMobile)
          .map(({ to, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cx(styles.tab, isActive && styles.tabActive)}
          >
            <span className={styles.tabIcon}>
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              {badgeFor(to) > 0 && (
                <span className={cx(styles.tabBadge, to === '/admin/chamados' && styles.badgeCall)}>{badgeFor(to)}</span>
              )}
            </span>
            <span>{short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

/** Estrutura do painel: menu lateral (ou inferior no celular) + conteúdo da página. */
export function AdminLayout() {
  return (
    <AdminProvider>
      <Shell />
    </AdminProvider>
  )
}
