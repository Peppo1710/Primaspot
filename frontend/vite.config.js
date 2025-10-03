import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    hmr: {
      port: 5173,
      host: 'localhost'
    },
    watch: {
      usePolling: false,
      ignored: [
        '**/node_modules/**', 
        '**/.git/**',
        '../backend/**',
        '../ml_backend/**',
        '../utils/**',
        '**/.env*'
      ]
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  }
})
