import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Política de segurança de conteúdo (CSP) no site publicado (só no `npm run build`).
 * O navegador só executa código deste site e só conversa com a API do Tabajara.
 */
function contentSecurityPolicy(apiUrl: string): Plugin {
  const api = apiUrl ? new URL(apiUrl).origin : ''
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
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
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="referrer" content="no-referrer" />`,
      ),
  }
}

// Site separado só para o QR "Chamar atendente". Em desenvolvimento roda na porta 5174
// (o cardápio usa a 5173) e repassa /api para o mesmo backend (porta 8000).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), contentSecurityPolicy(env.VITE_API_URL ?? '')],
    server: {
      port: 5174,
      proxy: {
        '/api': 'http://127.0.0.1:8000',
      },
    },
    build: {
      sourcemap: false,
    },
  }
})
