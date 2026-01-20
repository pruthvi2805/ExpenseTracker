import * as state from './state.js'
import * as ui from './ui.js'
import { formatCurrency, formatMonthKey, getCurrentMonthKey, getPrevMonthKey, getNextMonthKey, generateId, getMonthKeyFromDate } from './utils.js'

// App state
let currentMonth = getCurrentMonthKey()
let currentTab = 'dashboard'

// ==================== INITIALIZATION ====================

function init() {
  if (state.isFirstUse()) {
    showOnboarding()
  } else {
    showMainApp()
  }
}

function showOnboarding() {
  document.getElementById('onboarding').classList.remove('hidden')
  document.getElementById('main-app').classList.add('hidden')

  document.getElementById('get-started-btn').addEventListener('click', () => {
    const currency = document.getElementById('currency-select').value
    state.saveSettings({ currency })
    showMainApp()
  })
}

function showMainApp() {
  document.getElementById('onboarding').classList.add('hidden')
  document.getElementById('main-app').classList.remove('hidden')

  setupNavigation()
  setupTabs()
  render()

  // Listen for data changes
  window.addEventListener('data-changed', render)
}

// ==================== NAVIGATION ====================

function setupNavigation() {
  document.getElementById('prev-month').addEventListener('click', () => {
    currentMonth = getPrevMonthKey(currentMonth)
    render()
  })

  document.getElementById('next-month').addEventListener('click', () => {
    currentMonth = getNextMonthKey(currentMonth)
    render()
  })
}

// ==================== TABS ====================

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab
      updateTabStyles()
      renderTabContent()
    })
  })
}

function updateTabStyles() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === currentTab) {
      btn.classList.add('active')
    } else {
      btn.classList.remove('active')
    }
  })
}

// ==================== RENDERING ====================

function render() {
  renderMonthHeader()
  renderSummary()
  updateTabStyles()
  renderTabContent()
}

function renderMonthHeader() {
  document.getElementById('current-month').textContent = formatMonthKey(currentMonth)
}

function renderSummary() {
  const settings = state.getSettings()
  const currency = settings?.currency || 'USD'

  const income = state.getIncome(currentMonth)
  const spent = state.getTotalSpent(currentMonth)
  const left = income - spent

  document.getElementById('summary-income').textContent = formatCurrency(income, currency)
  document.getElementById('summary-spent').textContent = formatCurrency(spent, currency)

  const leftEl = document.getElementById('summary-left')
  leftEl.textContent = formatCurrency(left, currency)
  leftEl.className = `text-lg font-bold mt-1 ${left >= 0 ? 'text-green-600' : 'text-red-600'}`
}

function renderTabContent() {
  const container = document.getElementById('tab-content')

  switch (currentTab) {
    case 'dashboard':
      container.innerHTML = ui.renderDashboard(currentMonth)
      break

    case 'add':
      container.innerHTML = ui.renderAddExpense(currentMonth)
      ui.setupAddExpenseHandlers(currentMonth, handleAddExpense)
      break

    case 'budget':
      container.innerHTML = ui.renderBudget(currentMonth)
      ui.setupBudgetHandlers(currentMonth)
      break

    case 'list':
      container.innerHTML = ui.renderExpenseList(currentMonth)
      ui.setupExpenseListHandlers(currentMonth, handleDeleteExpense)
      break
  }
}

// ==================== EVENT HANDLERS ====================

function handleAddExpense({ amount, categoryId, date }) {
  const expense = {
    id: generateId(),
    amount,
    categoryId,
    date
  }

  state.addExpense(expense)
  ui.showToast('Expense added!')

  // If expense is for a different month, switch to it
  const expenseMonth = getMonthKeyFromDate(date)
  if (expenseMonth !== currentMonth) {
    currentMonth = expenseMonth
  }

  render()
}

function handleDeleteExpense(id) {
  state.deleteExpense(id)
  ui.showToast('Expense deleted')
  render()
}

// ==================== START ====================

document.addEventListener('DOMContentLoaded', init)
