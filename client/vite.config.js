import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const lanHosts = ['paloaltolin.home.alextac.com']

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 3000, allowedHosts: lanHosts },
  preview: { port: 4173, allowedHosts: lanHosts },
})
