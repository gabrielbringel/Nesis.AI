import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' is required for the Chrome extension: assets load through paths
// relative to the manifest, with no server behind them. Vite copies public/
// into dist/ as-is, so manifest.json, background.js, and icons/ land at the
// build root automatically.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
})
