import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { HomeIcon, ClipboardDocumentListIcon, BanknotesIcon, Cog6ToothIcon, QuestionMarkCircleIcon, LinkIcon, PrinterIcon } from '@heroicons/react/24/outline'
import Dashboard from './pages/Dashboard.jsx'
import Incomes from './pages/Incomes.jsx'
import Budget from './pages/Budget.jsx'
import Settings from './pages/Settings.jsx'
import Help from './pages/Help.jsx'
import { MonthPicker } from './components/MonthPicker.jsx'
import { MonthProvider } from './lib/monthContext.jsx'

function App() {
  const location = useLocation()
  return (
    <MonthProvider>
      <div className="min-h-full">
        <header className="shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Expense Tracker</h1>
            <div className="flex items-center gap-2">
              <MonthPicker />
              {location.pathname === '/' && (
                <button className="btn p-2" title="Print summary" onClick={()=>window.print()}>
                  <PrinterIcon className="w-4 h-4"/>
                </button>
              )}
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
          <nav className="lg:col-span-1 bg-white rounded border p-3 h-max">
            <ul className="space-y-1">
              <li><NavItem to="/" label="Dashboard" icon={<HomeIcon className="w-5 h-5"/>} /></li>
              <li><NavItem to="/budget" label="Budget" icon={<ClipboardDocumentListIcon className="w-5 h-5"/>} /></li>
              <li><NavItem to="/income" label="Income" icon={<BanknotesIcon className="w-5 h-5"/>} /></li>
              <li><NavItem to="/settings" label="Settings" icon={<Cog6ToothIcon className="w-5 h-5"/>} /></li>
              <li><NavItem to="/help" label="How to use" icon={<QuestionMarkCircleIcon className="w-5 h-5"/>} /></li>
            </ul>
          </nav>
          <main className="lg:col-span-4">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/income" element={<Incomes />} />
              <Route path="/help" element={<Help />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
            <div className="mt-8 mb-2 flex items-center justify-center gap-3 text-[11px] text-gray-400">
              <span>Built by Pruthvi</span>
              <a href="https://github.com/pruthvi2805" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-gray-600">
                <LinkIcon className="w-4 h-4"/>
                <span>github.com/pruthvi2805</span>
              </a>
            </div>
          </main>
        </div>
      </div>
    </MonthProvider>
  )
}

function NavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded px-3 py-2 text-sm font-medium hover:bg-indigo-50 border-l-2 ${
          isActive ? 'bg-indigo-50 text-indigo-700 border-indigo-500 pl-2' : 'text-gray-600 border-transparent'
        }`
      }
    >
      {icon}<span>{label}</span>
    </NavLink>
  )
}

export default App
