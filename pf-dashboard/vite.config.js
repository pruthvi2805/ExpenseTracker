import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Deploying to GitHub Pages project site: https://<user>.github.io/ExpenseTracker/
  // Ensure assets resolve under the repo subpath
  base: '/ExpenseTracker/',
  plugins: [react()],
  // Emit production build to top-level docs/ for Pages
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
})
