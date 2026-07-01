import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Route existing imports to the local compatibility module so Vite can bundle reliably.
      'react-hot-toast': '/src/lib/reactHotToast.tsx',
    },
  },
})
