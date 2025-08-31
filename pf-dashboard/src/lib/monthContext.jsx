import { useMemo, useState, useEffect } from 'react'
import { format } from 'date-fns'
import { MonthContext } from './monthStore.js'
import { LOCAL_STORAGE_KEYS, DATE_FORMATS } from './constants.js'

export function MonthProvider({ children }) {
  const now = new Date()
  const defaultMonthKey = format(now, DATE_FORMATS.MONTH_KEY)
  const [monthKey, setMonthKey] = useState(() => localStorage.getItem(LOCAL_STORAGE_KEYS.MONTH_KEY) || defaultMonthKey)

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.MONTH_KEY, monthKey)
  }, [monthKey])

  const value = useMemo(() => ({ monthKey, setMonthKey }), [monthKey])
  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>
}
// month navigation helpers moved to lib/monthUtils.js; hook moved to lib/useMonth.js
