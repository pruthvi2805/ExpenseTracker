import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { format } from 'date-fns'

const MonthContext = createContext(null)

export function MonthProvider({ children }) {
  const now = new Date()
  const defaultMonthKey = format(now, 'yyyy-MM')
  const [monthKey, setMonthKey] = useState(() => localStorage.getItem('pf-month') || defaultMonthKey)

  useEffect(() => {
    localStorage.setItem('pf-month', monthKey)
  }, [monthKey])

  const value = useMemo(() => ({ monthKey, setMonthKey }), [monthKey])
  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>
}

export function useMonth() {
  const ctx = useContext(MonthContext)
  if (!ctx) throw new Error('useMonth must be used within MonthProvider')
  return ctx
}

export function nextMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() + 1)
  return format(d, 'yyyy-MM')
}

export function prevMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return format(d, 'yyyy-MM')
}

