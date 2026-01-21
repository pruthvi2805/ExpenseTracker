import { categories, getCategoryById, categoryIcons } from './categories.js'
import { formatCurrency, formatDate, getTodayDate } from './utils.js'
import * as state from './state.js'

// Get currency from settings
function getCurrency() {
  const settings = state.getSettings()
  return settings?.currency || 'USD'
}

function getCurrencySymbol(currency) {
  const symbols = { USD: '$', EUR: '\u20ac', GBP: '\u00a3', INR: '\u20b9', AUD: 'A$', CAD: 'C$' }
  return symbols[currency] || '$'
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
      <div class="empty-state">
        <p class="empty-state__title">No budget set for this month</p>
        <p class="empty-state__desc">Track spending against your budget limits here</p>
        <p class="empty-state__hint">Go to Budget tab to set your spending limits</p>
      </div>
    `
  }

  return `
    <div class="card">
      ${activeCategories.map(cat => {
        const budgetAmt = budget[cat.id] || 0
        const spentAmt = spent[cat.id] || 0
        const percent = budgetAmt > 0 ? Math.min((spentAmt / budgetAmt) * 100, 100) : 0
        const isOver = spentAmt > budgetAmt && budgetAmt > 0
        const barColor = isOver ? 'var(--color-error)' : percent > 80 ? 'var(--color-warning)' : 'var(--color-success)'

        return `
          <div class="dashboard-item">
            <div class="dashboard-item__header">
              <div class="dashboard-item__left">
                <div class="category-icon" style="background-color: ${cat.color}20; color: ${cat.color}">
                  ${categoryIcons[cat.icon]}
                </div>
                <span class="dashboard-item__name">${cat.label}</span>
              </div>
              <div class="dashboard-item__values">
                <span class="dashboard-item__spent ${isOver ? 'text-error' : ''}">${formatCurrency(spentAmt, currency)}</span>
                ${budgetAmt > 0 ? `<span class="dashboard-item__budget"> / ${formatCurrency(budgetAmt, currency)}</span>` : ''}
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

export function renderAddExpense(monthKey) {
  const currency = getCurrency()
  const today = getTodayDate()

  return `
    <div class="card">
      <div class="form-group">
        <label class="form-label">Amount</label>
        <div class="input-wrapper">
          <span class="input-prefix">${getCurrencySymbol(currency)}</span>
          <input type="number" id="expense-amount" placeholder="0" min="0" step="0.01"
            class="form-input form-input--with-prefix">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Category</label>
        <select id="expense-category" class="form-input">
          ${categories.map(cat => `<option value="${cat.id}">${cat.label}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Date</label>
        <input type="date" id="expense-date" value="${today}" class="form-input">
      </div>

      <button id="save-expense-btn" class="btn btn--primary">
        Add Expense
      </button>
    </div>
  `
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
    <!-- Income -->
    <div class="card">
      <div class="form-group" style="margin-bottom: 0">
        <label class="form-label">Monthly Income</label>
        <div class="input-wrapper">
          <span class="input-prefix">${getCurrencySymbol(currency)}</span>
          <input type="number" id="income-input" value="${income || ''}" placeholder="0" min="0"
            class="form-input form-input--with-prefix">
        </div>
      </div>
    </div>

    <!-- Budget by category -->
    <div class="card">
      <h3 class="card__title">Budget by Category</h3>
      ${categories.map(cat => `
        <div class="budget-item">
          <div class="category-icon" style="background-color: ${cat.color}20; color: ${cat.color}">
            ${categoryIcons[cat.icon]}
          </div>
          <span class="budget-item__label">${cat.label}</span>
          <div class="budget-item__input">
            <div class="input-wrapper">
              <span class="input-prefix">${getCurrencySymbol(currency)}</span>
              <input type="number" data-category="${cat.id}" value="${budget[cat.id] || ''}" placeholder="0" min="0"
                class="budget-input form-input form-input--with-prefix">
            </div>
          </div>
        </div>
      `).join('')}
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

export function renderExpenseList(monthKey) {
  const expenses = state.getExpenses(monthKey)
  const currency = getCurrency()

  if (expenses.length === 0) {
    return `
      <div class="empty-state">
        <p class="empty-state__title">No expenses this month</p>
        <p class="empty-state__desc">View and manage all your recorded expenses here</p>
        <p class="empty-state__hint">Go to Add tab to record an expense</p>
      </div>
    `
  }

  // Sort by date descending
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date))

  return `
    <div>
      ${sorted.map(expense => {
        const cat = getCategoryById(expense.categoryId)
        return `
          <div class="expense-row">
            <div class="category-icon" style="background-color: ${cat.color}20; color: ${cat.color}">
              ${categoryIcons[cat.icon]}
            </div>
            <div class="expense-row__info">
              <p class="expense-row__category">${cat.label}</p>
              <p class="expense-row__date">${formatDate(expense.date)}</p>
            </div>
            <span class="expense-row__amount">${formatCurrency(expense.amount, currency)}</span>
            <button class="delete-btn" data-id="${expense.id}" aria-label="Delete expense">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
