import { format } from 'date-fns'
import { DATE_FORMATS } from './constants.js'

export function nextMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() + 1)
  return format(d, DATE_FORMATS.MONTH_KEY)
}

export function prevMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return format(d, DATE_FORMATS.MONTH_KEY)
}

