import { format } from 'date-fns'
import Decimal from 'decimal.js'
import { DATE_FORMATS, NUMERIC_CONSTANTS } from './constants.js'

export function money(v, currency = 'USD') {
  const n = new Decimal(v || 0)
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n.toDecimalPlaces(2).toNumber())
}

export function fmtDelta(v, currency){
  const n = new Decimal(v||0)
  if (n.equals(0)) return money(0, currency)
  const sign = n.greaterThan(0) ? '' : '-'
  return sign + money(n.abs(), currency)
}

export function clsDelta(v){
  const n = new Decimal(v||0)
  if (n.greaterThan(0)) return 'text-red-600'
  if (n.lessThan(0)) return 'text-emerald-600'
  return 'text-gray-600'
}

export function computeDaysLeft(monthKey){
  try {
    const [y,m] = monthKey.split('-').map(Number)
    const last = new Date(y, m, 0) // last day of month
    const today = new Date()
    if (today.getFullYear()===y && (today.getMonth()+1)===m){
      const left = last.getDate() - today.getDate() + 1
      return Math.max(1, left)
    }
    return last.getDate()
  } catch { return NUMERIC_CONSTANTS.DEFAULT_DAYS_IN_MONTH }
}

export function sumNumbers(arr) { return arr.reduce((a, b) => a + (Number(b) || 0), 0) }
