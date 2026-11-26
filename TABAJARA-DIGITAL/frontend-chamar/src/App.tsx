import { CallWaiterPage } from './pages/CallWaiterPage'

/**
 * O QR de cada mesa aponta para /chamar/<código da mesa>: a página já abre com a mesa.
 * Sem o código, abre direto nos botões e o cliente escolhe a mesa dele.
 */
const TOKEN_PATH = /^\/chamar\/([A-Za-z0-9_-]{4,40})\/?$/

export default function App() {
  const token = TOKEN_PATH.exec(window.location.pathname)?.[1] ?? null
  return <CallWaiterPage token={token} />
}
