import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/novalumen-api': {
        target: 'https://api.novalumen.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/novalumen-api/, ''),
      },
    },
  },
})