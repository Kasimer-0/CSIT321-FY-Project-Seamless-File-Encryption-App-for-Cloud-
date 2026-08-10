import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'stealthsync-classic-production-entry',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          // JavaFX 21 WebView ignores module entries and does not reliably honor
          // `defer` for a classic script in <head>. Move the self-contained Vite
          // bundle after #root so React always receives a parsed mount element.
          const entryPattern = /<script type="module"([^>]*)><\/script>/
          const entry = html.match(entryPattern)
          if (!entry) return html

          const classicEntry = `<script${entry[1]}></script>`
          return html
            .replace(entryPattern, '')
            .replace('</body>', `  ${classicEntry}\n  </body>`)
        },
      },
    },
  ],
  build: {
    // Keep syntax within the JavaFX 21 WebKit baseline while remaining fully
    // supported by the current Edge and Chrome versions used for the web demo.
    target: 'es2017',
  },
  resolve: {
    alias: {
      // Route existing imports to the local compatibility module so Vite can bundle reliably.
      'react-hot-toast': '/src/lib/reactHotToast.tsx',
    },
  },
})
