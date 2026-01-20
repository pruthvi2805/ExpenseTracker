import { categories, getCategoryById, categoryIcons } from './categories.js'
import { formatCurrency, formatDate, getTodayDate } from './utils.js'
import * as state from './state.js'

// Get currency from settings
function getCurrency() {
  const settings = state.getSettings()
  return settings?.currency || 'USD'
}

// Show toast notification
export function showToast(message = 'Saved!') {
  const toast = document.getElementById('toast')
  toast.textContent = message
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 2000)
}

// ==================== DASHBOARD VIEW ====================

export function renderDashboard(monthKey) {
  const budget = state.getBudget(monthKey)
  const spent = state.getSpentByCategory(monthKey)
  const currency = getCurrency()

  // Filter to categories that have either budget or spending
  const activeCategories = categories.filter(cat =>
    (budget[cat.id] || 0) > 0 || (spent[cat.id] || 0) > 0
  )

  if (activeCategories.length === 0) {
    return `
      <div class="text-center py-12 text-gray-500">
        <p class="mb-2">No budget set for this month</p>
        <p class="text-sm">Go to Budget tab to set your spending limits</p>
      </div>
    `
  }

  return `
    <div class="space-y-4">
      ${activeCategories.map(cat => {
        const budgetAmt = budget[cat.id] || 0
        const spentAmt = spent[cat.id] || 0
        const percent = budgetAmt > 0 ? Math.min((spentAmt / budgetAmt) * 100, 100) : 0
        const isOver = spentAmt > budgetAmt && budgetAmt > 0
        const barColor = isOver ? '#ef4444' : percent > 80 ? '#f59e0b' : '#22c55e'

        return `
          <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <div class="category-icon" style="background-color: ${cat.color}20; color: ${cat.color}">
                  ${categoryIcons[cat.icon]}
                </div>
                <span class="font-medium text-gray-800">${cat.label}</span>
              </div>
              <div class="text-right">
                <span class="${isOver ? 'text-red-600' : 'text-gray-800'} font-semibold">${formatCurrency(spentAmt, currency)}</span>
                ${budgetAmt > 0 ? `<span class="text-gray-400"> / ${formatCurrency(budgetAmt, currency)}</span>` : ''}
              </div>
            </div>
            ${budgetAmt > 0 ? `
              <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${percent}%; background-color: ${barColor}"></div>
              </div>
            ` : ''}
          </div>
        `
      }).join('')}
    </div>
  `
}

// ==================== ADD EXPENSE VIEW ====================

export function renderAddExpense(monthKey, onSave) {
  const currency = getCurrency()
  const today = getTodayDate()

  const html = `
    <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">${getCurrencySymbol(currency)}</span>
            <input type="number" id="expense-amount" placeholder="0" min="0" step="0.01"
              class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select id="expense-category" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            ${categories.map(cat => `<option value="${cat.id}">${cat.label}</option>`).join('')}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" id="expense-date" value="${today}"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
        </div>

        <button id="save-expense-btn" class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Add Expense
        </button>
      </div>
    </div>
  `

  return html
}

function getCurrencySymbol(currency) {
  const symbols = { USD: '$', EUR: '\u20ac', GBP: '\u00a3', INR: '\u20b9', AUD: 'A$', CAD: 'C$' }
  return symbols[currency] || '$'
}

export function setupAddExpenseHandlers(monthKey, onSave) {
  const btn = document.getElementById('save-expense-btn')
  if (btn) {
    btn.addEventListener('click', () => {
      const amount = parseFloat(document.getElementById('expense-amount').value)
      const categoryId = document.getElementById('expense-category').value
      const date = document.getElementById('expense-date').value

      if (!amount || amount <= 0) {
        showToast('Enter a valid amount')
        return
      }

      if (!date) {
        showToast('Select a date')
        return
      }

      onSave({ amount, categoryId, date })

      // Reset form
      document.getElementById('expense-amount').value = ''
      document.getElementById('expense-amount').focus()
    })
  }
}

// ==================== BUDGET VIEW ====================

export function renderBudget(monthKey) {
  const budget = state.getBudget(monthKey)
  const income = state.getIncome(monthKey)
  const currency = getCurrency()

  return `
    <div class="space-y-4">
      <!-- Income -->
      <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
        <label class="block text-sm font-medium text-gray-700 mb-2">Monthly Income</label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">${getCurrencySymbol(currency)}</span>
          <input type="number" id="income-input" value="${income || ''}" placeholder="0" min="0"
            class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
        </div>
      </div>

      <!-- Budget by category -->
      <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
        <h3 class="font-medium text-gray-800 mb-4">Budget by Category</h3>
        <div class="space-y-3">
          ${categories.map(cat => `
            <div class="flex items-center gap-3">
              <div class="category-icon" style="background-color: ${cat.color}20; color: ${cat.color}">
                ${categoryIcons[cat.icon]}
              </div>
              <span class="flex-1 text-sm text-gray-700">${cat.label}</span>
              <div class="relative w-28">
                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">${getCurrencySymbol(currency)}</span>
                <input type="number" data-category="${cat.id}" value="${budget[cat.id] || ''}" placeholder="0" min="0"
                  class="budget-input w-full pl-6 pr-2 py-2 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `
}

export function setupBudgetHandlers(monthKey) {
  // Income input
  const incomeInput = document.getElementById('income-input')
  if (incomeInput) {
    incomeInput.addEventListener('change', () => {
      const amount = parseFloat(incomeInput.value) || 0
      state.setIncome(monthKey, amount)
      showToast('Income saved')
      window.dispatchEvent(new Event('data-changed'))
    })
  }

  // Budget inputs
  document.querySelectorAll('.budget-input').forEach(input => {
    input.addEventListener('change', () => {
      const categoryId = input.dataset.category
      const amount = parseFloat(input.value) || 0
      state.setBudget(monthKey, categoryId, amount)
      showToast('Budget saved')
      window.dispatchEvent(new Event('data-changed'))
    })
  })
}

// ==================== EXPENSE LIST VIEW ====================

export function renderExpenseList(monthKey, onDelete) {
  const expenses = state.getExpenses(monthKey)
  const currency = getCurrency()

  if (expenses.length === 0) {
    return `
      <div class="text-center py-12 text-gray-500">
        <p class="mb-2">No expenses this month</p>
        <p class="text-sm">Go to Add tab to record an expense</p>
      </div>
    `
  }

  // Sort by date descending
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date))

  return `
    <div class="space-y-2">
      ${sorted.map(expense => {
        const cat = getCategoryById(expense.categoryId)
        return `
          <div class="expense-row bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div class="category-icon" style="background-color: ${cat.color}20; color: ${cat.color}">
              ${categoryIcons[cat.icon]}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-800 truncate">${cat.label}</p>
              <p class="text-sm text-gray-500">${formatDate(expense.date)}</p>
            </div>
            <span class="font-semibold text-gray-800">${formatCurrency(expense.amount, currency)}</span>
            <button class="delete-btn p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" data-id="${expense.id}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        `
      }).join('')}
    </div>
  `
}

export function setupExpenseListHandlers(monthKey, onDelete) {
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id
      if (confirm('Delete this expense?')) {
        onDelete(id)
      }
    })
  })
}
