import {
  ArrowUp,
  ArrowUpRight,
  Clock,
  Crown,
  Gift,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { brand } from '../../config/brand'
import type { Category } from '../../types/menu'
import { prefersReducedMotion } from '../../utils/dom'
import { InstagramIcon } from '../ui/InstagramIcon'
import { Logo } from '../ui/Logo'
import { Ornament } from '../ui/Ornament'
import { Reveal } from '../ui/Reveal'
import styles from './MenuFooter.module.css'

interface MenuFooterProps {
  categories: Category[]
  onSelectCategory: (slug: string) => void
}

/**
 * Rodapé do cardápio: destaque do Instagram, assinatura da marca, atalhos
 * (cardápio e Clube), informações do restaurante (config/brand.ts) e avisos.
 */
export function MenuFooter({ categories, onSelectCategory }: MenuFooterProps) {
  const year = new Date().getFullYear()
  const instagramUrl = brand.instagram ? `https://www.instagram.com/${brand.instagram}/` : ''
  const whatsappUrl = brand.whatsapp ? `https://wa.me/${brand.whatsapp}` : ''
  const hasVisit = Boolean(brand.address) || brand.hours.length > 0

  const backToTop = () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })

  return (
    <footer className={styles.footer}>
      <span className={styles.topLine} aria-hidden="true" />

      {/* Destaque do Instagram */}
      {instagramUrl && (
        <Reveal className={styles.insta}>
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.instaCard}>
            <span className={styles.instaGlow} aria-hidden="true" />
            <span className={styles.instaIcon}>
              <InstagramIcon size={26} />
            </span>
            <span className={styles.instaText}>
              <span className={styles.instaEyebrow}>Siga no Instagram</span>
              <span className={styles.instaHandle}>@{brand.instagram}</span>
              <span className={styles.instaSub}>Novidades, pratos do dia e bastidores da brasa</span>
            </span>
            <span className={styles.instaCta}>
              Seguir <ArrowUpRight size={16} aria-hidden="true" />
            </span>
          </a>
        </Reveal>
      )}

      {/* Assinatura */}
      <Reveal className={styles.signature}>
        <Ornament />
        <p className={styles.thanks}>Obrigado pela preferência</p>
        <Logo size="xl" />
        <p className={styles.city}>{brand.city}</p>
        <div className={styles.social}>
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialButton}
              aria-label={`Instagram do ${brand.name} (@${brand.instagram})`}
            >
              <InstagramIcon size={20} />
            </a>
          )}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialButton}
              aria-label={`WhatsApp do ${brand.name}`}
            >
              <MessageCircle size={20} strokeWidth={1.75} />
            </a>
          )}
          {brand.phone && (
            <a
              href={`tel:${brand.phone.replace(/\D/g, '')}`}
              className={styles.socialButton}
              aria-label={`Ligar para o ${brand.name}`}
            >
              <Phone size={19} strokeWidth={1.75} />
            </a>
          )}
        </div>
      </Reveal>

      <div className={styles.grid}>
        {categories.length > 0 && (
          <Reveal className={styles.column}>
            <h2 className={styles.heading}>Cardápio</h2>
            <ul className={styles.links}>
              {categories.map((category) => (
                <li key={category.id}>
                  <button type="button" className={styles.link} onClick={() => onSelectCategory(category.slug)}>
                    {category.name}
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        <Reveal className={styles.column} delay={80}>
          <h2 className={styles.heading}>Clube Tabajara</h2>
          <ul className={styles.links}>
            <li>
              <Link to="/clube" className={styles.link}>
                <Crown size={15} strokeWidth={1.75} aria-hidden="true" /> Meus pontos
              </Link>
            </li>
            <li>
              <Link to="/clube?aba=recompensas" className={styles.link}>
                <Gift size={15} strokeWidth={1.75} aria-hidden="true" /> Recompensas
              </Link>
            </li>
            <li>
              <Link to="/privacidade" className={styles.link}>
                <ShieldCheck size={15} strokeWidth={1.75} aria-hidden="true" /> Privacidade
              </Link>
            </li>
          </ul>
        </Reveal>

        <Reveal className={styles.column} delay={160}>
          <h2 className={styles.heading}>{hasVisit ? 'Visite-nos' : 'Contato'}</h2>
          <ul className={styles.info}>
            {brand.address && (
              <li>
                <MapPin size={16} strokeWidth={1.5} aria-hidden="true" />
                {brand.mapsUrl ? (
                  <a href={brand.mapsUrl} target="_blank" rel="noopener noreferrer">
                    {brand.address}
                  </a>
                ) : (
                  <span>{brand.address}</span>
                )}
              </li>
            )}
            {brand.hours.map((line) => (
              <li key={line}>
                <Clock size={16} strokeWidth={1.5} aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
            {brand.phone && (
              <li>
                <Phone size={16} strokeWidth={1.5} aria-hidden="true" />
                <a href={`tel:${brand.phone.replace(/\D/g, '')}`}>{brand.phone}</a>
              </li>
            )}
            {instagramUrl && (
              <li>
                <InstagramIcon size={16} strokeWidth={1.5} />
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                  @{brand.instagram}
                </a>
              </li>
            )}
          </ul>
        </Reveal>

        <Reveal className={styles.column} delay={240}>
          <h2 className={styles.heading}>Informações</h2>
          <div className={styles.notice}>
            <TriangleAlert size={18} strokeWidth={1.5} aria-hidden="true" />
            <p>Tem alguma alergia ou restrição alimentar? Informe nossa equipe antes do pedido.</p>
          </div>
          <p className={styles.small}>Preços em reais (R$), sujeitos a alteração. Imagens meramente ilustrativas.</p>
        </Reveal>
      </div>

      <div className={styles.bottom}>
        <p>
          © {year} {brand.name} · {brand.city}
        </p>
        <button type="button" className={styles.top} onClick={backToTop}>
          Voltar ao topo
          <ArrowUp size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </footer>
  )
}
