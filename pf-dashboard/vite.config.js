import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Deploying to GitHub Pages project site: https://<user>.github.io/ExpenseTracker/
  // Ensure assets resolve under the repo subpath
  base: '/ExpenseTracker/',
  plugins: [react()],
  // Emit production build locally to dist/; CI will publish it to Pages
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
