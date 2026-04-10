import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin /api in dev so auth cookies work and CORS/HTTPS redirects do not break fetch()
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5031',
        changeOrigin: true,
      },
    },
  },
})
