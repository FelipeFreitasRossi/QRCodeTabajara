import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

import { cx } from '../../utils/dom'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode
  /** outline: contorno dourado · primary: dourado preenchido · ghost: só texto */
  variant?: 'outline' | 'primary' | 'ghost'
  block?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  icon,
  variant = 'outline',
  block = false,
  children,
  className,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(styles.button, styles[variant], block && styles.block, className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
