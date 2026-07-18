import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed at astarmedia.net/heatcheck/
export default defineConfig({
  plugins: [react()],
  base: '/heatcheck/',
})
