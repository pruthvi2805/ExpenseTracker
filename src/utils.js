// Currency symbols
const currencySymbols = {
  USD: '$',
  EUR: '\u20ac',
  GBP: '\u00a3',
  INR: '\u20b9',
  AUD: 'A$',
  CAD: 'C$'
}

// Format amount with currency
export function formatCurrency(amount, currency = 'USD') {
  const symbol = currencySymbols[currency] || '$'
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`
}

// Format date for display
export function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Get current month key (YYYY-MM)
export function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Format month key for display
export function formatMonthKey(monthKey) {
  const [year, month] = monthKey.split('-')
  const date = new Date(year, parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Get previous month key
export function getPrevMonthKey(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 2)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Get next month key
export function getNextMonthKey(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Generate unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Get today's date as YYYY-MM-DD
export function getTodayDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Get month key from date string
export function getMonthKeyFromDate(dateStr) {
  return dateStr.substring(0, 7)
}
