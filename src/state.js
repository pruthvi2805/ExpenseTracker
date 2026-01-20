// localStorage keys
const KEYS = {
  expenses: 'et-expenses',
  budgets: 'et-budgets',
  income: 'et-income',
  settings: 'et-settings'
}

// Helper to read/write JSON from localStorage
function read(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : defaultValue
  } catch {
    return defaultValue
  }
}

function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ==================== SETTINGS ====================

export function getSettings() {
  return read(KEYS.settings, null)
}

export function saveSettings(settings) {
  write(KEYS.settings, settings)
}

export function isFirstUse() {
  return getSettings() === null
}

// ==================== EXPENSES ====================

export function getAllExpenses() {
  return read(KEYS.expenses, [])
}

export function getExpenses(monthKey) {
  const all = getAllExpenses()
  return all.filter(e => e.date.startsWith(monthKey))
}

export function addExpense(expense) {
  const all = getAllExpenses()
  all.push(expense)
  write(KEYS.expenses, all)
}

export function deleteExpense(id) {
  const all = getAllExpenses()
  const filtered = all.filter(e => e.id !== id)
  write(KEYS.expenses, filtered)
}

// ==================== BUDGETS ====================

export function getAllBudgets() {
  return read(KEYS.budgets, {})
}

export function getBudget(monthKey) {
  const all = getAllBudgets()
  return all[monthKey] || {}
}

export function setBudget(monthKey, categoryId, amount) {
  const all = getAllBudgets()
  if (!all[monthKey]) {
    all[monthKey] = {}
  }
  if (amount > 0) {
    all[monthKey][categoryId] = amount
  } else {
    delete all[monthKey][categoryId]
  }
  write(KEYS.budgets, all)
}

export function getTotalBudget(monthKey) {
  const budget = getBudget(monthKey)
  return Object.values(budget).reduce((sum, val) => sum + val, 0)
}

// ==================== INCOME ====================

export function getAllIncome() {
  return read(KEYS.income, {})
}

export function getIncome(monthKey) {
  const all = getAllIncome()
  return all[monthKey] || 0
}

export function setIncome(monthKey, amount) {
  const all = getAllIncome()
  if (amount > 0) {
    all[monthKey] = amount
  } else {
    delete all[monthKey]
  }
  write(KEYS.income, all)
}

// ==================== CALCULATIONS ====================

export function getTotalSpent(monthKey) {
  const expenses = getExpenses(monthKey)
  return expenses.reduce((sum, e) => sum + e.amount, 0)
}

export function getSpentByCategory(monthKey) {
  const expenses = getExpenses(monthKey)
  const byCategory = {}
  for (const e of expenses) {
    byCategory[e.categoryId] = (byCategory[e.categoryId] || 0) + e.amount
  }
  return byCategory
}

export function getRemaining(monthKey) {
  const income = getIncome(monthKey)
  const spent = getTotalSpent(monthKey)
  return income - spent
}
