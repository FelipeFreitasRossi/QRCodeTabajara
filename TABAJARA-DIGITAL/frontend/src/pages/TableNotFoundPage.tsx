import { QrCode } from 'lucide-react'

import { StateMessage } from '../components/ui/StateMessage'

/** Exibida quando o QR Code aponta para uma mesa inexistente ou desativada. */
export function TableNotFoundPage() {
  return (
    <StateMessage icon={<QrCode size={28} strokeWidth={1.5} />} title="Mesa não identificada">
      <p>
        Não conseguimos identificar sua mesa por este QR Code. Tente escaneá-lo novamente ou chame um
        de nossos atendentes. Será um prazer ajudar.
      </p>
    </StateMessage>
  )
}
