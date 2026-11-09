import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { brandPage } from './brand/vite-plugin.js'

const lanHosts = ['paloaltolin.home.alextac.com']

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), brandPage()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        brand: resolve(__dirname, 'brand/index.html'),
      },
    },
  },
  server: { port: 3000, allowedHosts: lanHosts },
  preview: { port: 4173, allowedHosts: lanHosts },
})
