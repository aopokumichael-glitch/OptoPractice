import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forwards frontend calls to /api/* to the Express backend during `npm run dev`.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
