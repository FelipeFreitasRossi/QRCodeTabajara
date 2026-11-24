import type { ReactNode } from 'react'

import { Logo } from './Logo'
import styles from './StateMessage.module.css'

interface StateMessageProps {
  icon: ReactNode
  title: string
  children: ReactNode
  action?: ReactNode
}

/** Tela cheia para estados especiais: erro de conexão, página inexistente. */
export function StateMessage({ icon, title, children, action }: StateMessageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Logo size="md" showTagline />
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.text}>{children}</div>
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </main>
  )
}
