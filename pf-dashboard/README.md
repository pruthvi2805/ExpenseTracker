# PF Dashboard (Expense Tracker)

A React + Vite application to plan budgets, track incomes/actuals, and view a dashboard summary. Styling uses Tailwind CSS. Routing powered by `react-router-dom`.

## Prerequisites

- Node.js 18+ (recommended 20). If you use `nvm`, run `nvm use`.

## Getting Started

```bash
cd pf-dashboard
npm install
npm run dev
```

Open the dev server URL printed by Vite.

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Build production assets to `dist/`
- `npm run preview`: Preview the production build locally
- `npm run lint`: Run ESLint

## Environment Variables

No secrets are required for local use. If you add environment variables later, create a `.env` file (ignored by Git) and reference via `import.meta.env`.

## Notes

- Some initial pages (e.g., `Categories`, `Summary`) may be present but are not linked in the UI. They are safe to keep for now.
- Build output (`dist/`) and `node_modules/` are ignored from version control.
