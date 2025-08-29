import { useMemo, useState, useEffect } from 'react'
import { format } from 'date-fns'
import { MonthContext } from './monthStore.js'

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
// month navigation helpers moved to lib/monthUtils.js; hook moved to lib/useMonth.js
