import { useRef, useState } from 'react'
import { Crown, QrCode, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useScrollFrame } from '../../hooks/useScrollFrame'
import { CartIconButton } from '../cart/CartIconButton'
import { Logo } from '../ui/Logo'
import { formatTable, readQrTable } from '../../utils/tableSession'
import styles from './MenuHeader.module.css'

interface MenuHeaderProps {
  onSearch: () => void
  onCart: () => void
}

/**
 * Cabeçalho fixo. Transparente sobre a capa e, ao rolar, ganha fundo com desfoque,
 * mostra o logotipo e uma linha dourada de progresso de leitura.
 * Os efeitos alteram o DOM direto (sem re-render) para manter o scroll a 60 fps.
 */
export function MenuHeader({ onSearch, onCart }: MenuHeaderProps) {
  const headerRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLSpanElement>(null)
  const [qrTable] = useState(() => readQrTable())

  useScrollFrame((scrollY) => {
    const header = headerRef.current
    if (!header) return

    header.dataset.solid = String(scrollY > 8)
    header.dataset.brand = String(scrollY > window.innerHeight * 0.3)

    const max = document.documentElement.scrollHeight - window.innerHeight
    const progress = max > 0 ? Math.min(1, scrollY / max) : 0
    progressRef.current?.style.setProperty('transform', `scaleX(${progress})`)
  })

  return (
    <header ref={headerRef} className={styles.header} data-sticky="header" data-solid="false" data-brand="false">
      <div className={styles.inner}>
        <div className={styles.start}>
          <a href="#topo" className={styles.brand} aria-label="Tabajara, voltar ao início">
            <Logo size="sm" />
          </a>
          {qrTable && (
            <span className={styles.tablePill} title="Mesa identificada pelo QR Code">
              <QrCode size={14} strokeWidth={2} aria-hidden="true" />
              {formatTable(qrTable.number)}
            </span>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} onClick={onSearch} aria-label="Pesquisar no cardápio">
            <Search size={20} strokeWidth={1.75} />
          </button>
          <Link to="/clube" className={`${styles.iconButton} ${styles.club}`} aria-label="Clube Tabajara: meus pontos">
            <Crown size={20} strokeWidth={1.75} />
          </Link>
          <CartIconButton onClick={onCart} />
        </div>
      </div>
      <span ref={progressRef} className={styles.progress} aria-hidden="true" />
    </header>
  )
}
