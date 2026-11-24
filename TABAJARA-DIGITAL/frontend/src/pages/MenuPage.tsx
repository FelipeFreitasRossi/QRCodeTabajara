import { useEffect } from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'

import { MenuContent } from '../components/menu/MenuContent'
import { MenuSkeleton } from '../components/menu/MenuSkeleton'
import { Button } from '../components/ui/Button'
import { StateMessage } from '../components/ui/StateMessage'
import { useMenu } from '../hooks/useMenu'

export function MenuPage() {
  const { state, retry } = useMenu()

  useEffect(() => {
    document.title = 'Cardápio · Tabajara'
  }, [])

  switch (state.status) {
    case 'loading':
      return <MenuSkeleton />
    case 'error':
      return (
        <StateMessage
          icon={<WifiOff size={26} strokeWidth={1.5} />}
          title="Não foi possível carregar"
          action={
            <Button onClick={retry} icon={<RefreshCw size={16} />}>
              Tentar novamente
            </Button>
          }
        >
          <p>{state.message}</p>
        </StateMessage>
      )
    case 'success':
      return <MenuContent menu={state.menu} />
  }
}
