import { defineConfig } from 'vite'
import { resolve } from 'path'

// Build separado para o content script da extensão.
//
// O content_scripts do Manifest V3 não suporta ES modules — precisa ser um
// arquivo IIFE auto-executável. Esse config gera dist/content-script.js como
// um bundle único, sem code-splitting.
//
// emptyOutDir: false porque o build da sidebar (vite.config.ts) roda antes
// e popula dist/ — não queremos apagar isso.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/content-script.ts'),
      name: 'NesisContentScript',
      formats: ['iife'],
      fileName: () => 'content-script.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
})
