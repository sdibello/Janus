import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  input: {
    campaigns: resolve(import.meta.dirname, 'index.html'),
    portal: resolve(import.meta.dirname, 'portal.html'),
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/identity': {
        target: 'http://localhost:5186',
        rewrite: (path) => path.replace(/^\/api\/identity/, ''),
      },
      '/api/campaigns': {
        target: 'http://localhost:5199',
        rewrite: (path) => path.replace(/^\/api\/campaigns/, ''),
      },
    },
  },
})
