import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em desenvolvimento, o Vite repassa /api e /uploads para o FastAPI (porta 8000).
// Assim o frontend e o backend funcionam juntos sem problemas de CORS,
// inclusive quando você abre o cardápio pelo celular na mesma rede Wi-Fi.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/uploads': 'http://127.0.0.1:8000',
    },
  },
})
