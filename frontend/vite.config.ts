import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' é obrigatório para a extensão Chrome — assets carregam via paths
// relativos ao manifest, sem servidor por trás. public/ é copiado in-place para
// dist/ pelo Vite, então manifest.json, background.js e icons/ aparecem na raiz
// do build automaticamente.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
