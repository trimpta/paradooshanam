import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/paradooshanam/',
  plugins: [react()],
  server: {
    allowedHosts: ['fedora.tail85834.ts.net']
  }
})
