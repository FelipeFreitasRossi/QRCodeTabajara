import { useEffect } from 'react'

import { PageHeader } from '../components/layout/PageHeader'
import { brand } from '../config/brand'
import styles from './PrivacyPage.module.css'

/**
 * Aviso de privacidade do Clube (LGPD). Texto-base: o restaurante deve revisar
 * com quem cuida da parte jurídica e completar os dados de contato do encarregado.
 */
export function PrivacyPage() {
  useEffect(() => {
    document.title = 'Privacidade · Clube Tabajara'
  }, [])

  return (
    <>
      <PageHeader backTo="/clube" backLabel="Clube" />
      <main className={styles.page}>
        <p className={styles.eyebrow}>Versão 2026-11</p>
        <h1 className={styles.title}>Aviso de privacidade do Clube Tabajara</h1>

        <h2>Quais dados coletamos</h2>
        <p>
          Nome, CPF, celular, e-mail (opcional), data de aniversário (opcional, para o presente), os pratos que você
          marcar como favoritos e o histórico dos pedidos feitos com o seu cadastro. Também guardamos a data em que você
          aceitou este aviso.
        </p>

        <h2>Para que usamos</h2>
        <p>
          Exclusivamente para identificar você no programa de pontos, calcular e creditar pontos dos seus pedidos e
          permitir que a equipe ajude quando você precisar (por exemplo, redefinir o PIN). Não vendemos nem
          compartilhamos seus dados para publicidade.
        </p>

        <h2>Como protegemos</h2>
        <p>
          O CPF não é armazenado em texto: guardamos uma impressão digital criptográfica dele e apenas os últimos
          dígitos para exibição. O PIN é guardado com criptografia de mão única (nem a equipe consegue lê-lo). Após 5
          tentativas erradas, o acesso fica bloqueado por 15 minutos. Por padrão, o login vale só para a visita: termina
          ao fechar a página ou após 30 minutos sem uso, a não ser que você marque "Manter conectado neste celular".
        </p>

        <h2>Seus direitos</h2>
        <p>
          Você pode pedir a qualquer momento acesso, correção ou exclusão dos seus dados, além de sair do Clube. Basta
          falar com a equipe no caixa{brand.phone ? ` ou pelo telefone ${brand.phone}` : ''}.
        </p>

        <h2>Por quanto tempo</h2>
        <p>
          Enquanto seu cadastro estiver ativo. Ao pedir a exclusão, seus dados pessoais são anonimizados; o registro dos
          pontos é mantido sem identificar você, apenas para controle contábil.
        </p>
      </main>
    </>
  )
}
