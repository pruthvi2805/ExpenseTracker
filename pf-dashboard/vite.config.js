import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Deploying to GitHub Pages project site: https://<user>.github.io/ExpenseTracker/
  // Ensure assets resolve under the repo subpath
  base: '/ExpenseTracker/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['vite.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'Expense Tracker',
        short_name: 'Expenses',
        description: 'Plan budgets, track incomes and actuals. Data stays local.',
        theme_color: '#4f46e5',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/ExpenseTracker/',
        scope: '/ExpenseTracker/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
      },
      // Generate icons from the existing SVG in public/
      pwaAssets: {
        image: 'public/vite.svg',
      },
    })
  ],
  // Emit production build locally to dist/; CI will publish it to Pages
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
