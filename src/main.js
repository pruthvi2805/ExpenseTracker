import * as state from './state.js'
import * as ui from './ui.js'
import { formatCurrency, formatMonthKey, getCurrentMonthKey, getPrevMonthKey, getNextMonthKey, generateId, getMonthKeyFromDate } from './utils.js'
import { initDatePicker } from './datepicker.js'

// App state
let currentMonth = getCurrentMonthKey()
let currentTab = 'dashboard'

// ==================== INITIALIZATION ====================

function init() {
  // Remove no-transitions class after page load
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transitions')
    })
  })

  // Setup theme toggle
  setupThemeToggle()

  // Setup date picker
  initDatePicker()

  // Setup help modal
  setupHelpModal()

  // Show appropriate view
  if (state.isFirstUse()) {
    showOnboarding()
  } else {
    showMainApp()
  }
}

// ==================== THEME ====================

function setupThemeToggle() {
  const toggle = document.getElementById('theme-toggle')
  if (!toggle) return

  toggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme')
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark'

    if (newTheme === 'light') {
      document.documentElement.removeAttribute('data-theme')
      localStorage.removeItem('kp-theme')
    } else {
      document.documentElement.setAttribute('data-theme', newTheme)
      localStorage.setItem('kp-theme', newTheme)
    }

    // Update aria-label
    toggle.setAttribute('aria-label', newTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')
  })
}

// ==================== HELP MODAL ====================

function setupHelpModal() {
  const helpLink = document.getElementById('help-link')
  const helpOverlay = document.getElementById('help-overlay')
  const helpModal = document.getElementById('help-modal')
  const helpClose = document.getElementById('help-close')

  if (!helpLink || !helpOverlay || !helpModal) return

  function openHelp(e) {
    e.preventDefault()
    helpOverlay.classList.add('show')
    helpModal.classList.add('show')
  }

  function closeHelp() {
    helpOverlay.classList.remove('show')
    helpModal.classList.remove('show')
  }

  helpLink.addEventListener('click', openHelp)
  helpOverlay.addEventListener('click', closeHelp)
  helpClose.addEventListener('click', closeHelp)
}

// ==================== ONBOARDING ====================

function showOnboarding() {
  document.getElementById('onboarding').classList.remove('hidden')
  document.getElementById('main-app').classList.add('hidden')

  document.getElementById('get-started-btn').addEventListener('click', () => {
    const currency = document.getElementById('currency-select').value
    state.saveSettings({ currency })
    showMainApp()
  })
}

// ==================== MAIN APP ====================

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

  // Update class for positive/negative
  leftEl.classList.remove('summary-card__value--positive', 'summary-card__value--negative')
  leftEl.classList.add(left >= 0 ? 'summary-card__value--positive' : 'summary-card__value--negative')
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

    case 'charts':
      container.innerHTML = ui.renderCharts(currentMonth)
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
