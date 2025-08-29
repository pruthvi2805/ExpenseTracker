# ExpenseTracker

![CI](https://github.com/pruthvi2805/ExpenseTracker/actions/workflows/ci.yml/badge.svg?branch=main)
![Pages](https://img.shields.io/badge/Pages-Live-blue)

A fast, privacy‑friendly personal expense tracker that runs entirely in your browser. Data is stored locally on your device (via IndexedDB using `localforage`). The app is built with React + Vite and deployed to GitHub Pages.

## Features

- Plan monthly budgets and track actuals by subcategory
- Quick monthly navigation and summary tiles
- Local‑only data — no backend, import/export JSON backup
- Mobile and desktop friendly UI
- GitHub Actions CI for build + lint on pull requests
- Installable PWA (offline capable) via `vite-plugin-pwa`

## Live Site

- GitHub Pages: https://pruthvi2805.github.io/ExpenseTracker/

## Tech Stack

- React, React Router, Vite
- Tailwind CSS (v4) for styling
- `localforage` for IndexedDB storage

## Local Development

- Requirements: Node.js (see `.nvmrc` for version)
- Start dev server:

```
cd pf-dashboard
npm install
npm run dev
```

- To access from your phone on the same Wi‑Fi, run with host:

```
npm run dev -- --host
```

## Production Build / Preview

```
cd pf-dashboard
npm run build
npm run preview -- --host
```

Vite `base` is set to `/ExpenseTracker/` for GitHub Pages.

### PWA

- The app ships as a PWA with offline caching.
- On mobile, use “Add to Home Screen” to install.
- Updates auto‑apply after next load (service worker `autoUpdate`).
- Icons are generated from `public/vite.svg` during build.

## Project Structure

- `pf-dashboard/` — Vite app (React)
- `.github/workflows/ci.yml` — CI: build + lint on PRs
- `.githooks/pre-push` — local hook to block pushing to `main`

### Removed Legacy Pages

Early prototypes included pages no longer used in the current design. The following files were removed to reduce noise:

- `src/pages/Plan.jsx`
- `src/pages/Actuals.jsx`
- `src/pages/Summary.jsx`
- `src/pages/Categories.jsx`
- `src/components/ComboBox.jsx` (unused)
- `src/assets/react.svg` (unused)

The live app routes are: Dashboard, Budget, Income, Settings, Help.

## Branching & PRs

- Work in feature branches, open PRs to `main`
- CI “Build & Lint” must pass; branch protection blocks direct pushes
- Squash merge for a tidy history

### Enable the local push guard

```
# from repo root
git config core.hooksPath .githooks
```

## Data & Privacy

- All data stays in your browser (IndexedDB)
- Use Settings → Backup to Export/Import JSON

## Scripts

From `pf-dashboard/`:

- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run preview` — serve the built bundle locally
- `npm run lint` — ESLint

## Contributing

- Use conventional commit messages (e.g., `feat:`, `fix:`, `chore:`)
- Keep PRs small and focused; include screenshots for UI changes

## License

MIT — see `LICENSE` for details.
