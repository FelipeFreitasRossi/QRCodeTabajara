import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Política de segurança de conteúdo (CSP) no site publicado (só no `npm run build`;
 * no `npm run dev` o Vite precisa de scripts próprios e fica sem ela).
 * Bloqueia scripts de terceiros: mesmo que alguém consiga injetar texto na página,
 * o navegador não executa código que não venha do próprio site.
 */
function contentSecurityPolicy(apiUrl: string): Plugin {
  const api = apiUrl ? new URL(apiUrl).origin : ''
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${api}`.trim(),
    `connect-src 'self' ${api}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'tabajara-csp',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`,
      ),
  }
}

// Em desenvolvimento, o Vite repassa /api e /uploads para o FastAPI (porta 8000).
// Assim o frontend e o backend funcionam juntos sem problemas de CORS,
// inclusive quando você abre o cardápio pelo celular na mesma rede Wi-Fi.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), contentSecurityPolicy(env.VITE_API_URL ?? '')],
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://127.0.0.1:8000',
        '/uploads': 'http://127.0.0.1:8000',
      },
    },
    build: {
      sourcemap: false, // não publica o código-fonte original junto com o site
    },
  }
})
