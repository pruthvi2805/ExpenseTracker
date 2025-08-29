import { useContext } from 'react'
import { MonthContext } from './monthStore.js'

export function useMonth() {
  const ctx = useContext(MonthContext)
  if (!ctx) throw new Error('useMonth must be used within MonthProvider')
  return ctx
}

