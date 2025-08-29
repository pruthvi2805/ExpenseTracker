import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Desktop-focused font: Inter latin subset (400/600)
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'
import './index.css'
import './sw-register.js'
import App from './App.jsx'

// Trivial runtime log to ensure a new build hash for update testing
if (typeof window !== 'undefined') {
  console.debug('ExpenseTracker: app bootstrap')
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>
)
