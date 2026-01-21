// Custom Date Picker Module

let currentCallback = null
let selectedDate = null
let viewDate = new Date()

const months = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// Format date as YYYY-MM-DD
export function formatDateValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Format date for display (e.g., "Jan 21, 2026")
export function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  const month = months[date.getMonth()].slice(0, 3)
  return `${month} ${date.getDate()}, ${date.getFullYear()}`
}

// Initialize the date picker
export function initDatePicker() {
  const overlay = document.getElementById('date-picker-overlay')
  const picker = document.getElementById('date-picker')
  const prevBtn = document.getElementById('date-picker-prev')
  const nextBtn = document.getElementById('date-picker-next')
  const daysContainer = document.getElementById('date-picker-days')

  // Close on overlay click
  overlay.addEventListener('click', closeDatePicker)

  // Navigation
  prevBtn.addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() - 1)
    renderDays()
  })

  nextBtn.addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() + 1)
    renderDays()
  })

  // Day selection
  daysContainer.addEventListener('click', (e) => {
    const dayBtn = e.target.closest('.date-picker__day')
    if (!dayBtn || dayBtn.disabled) return

    const dateStr = dayBtn.dataset.date
    if (dateStr && currentCallback) {
      currentCallback(dateStr)
      closeDatePicker()
    }
  })
}

// Open date picker
export function openDatePicker(currentValue, callback) {
  currentCallback = callback
  selectedDate = currentValue

  // Set view date to selected date or today
  if (currentValue) {
    viewDate = new Date(currentValue + 'T00:00:00')
  } else {
    viewDate = new Date()
  }

  renderDays()

  document.getElementById('date-picker-overlay').classList.add('show')
  document.getElementById('date-picker').classList.add('show')
}

// Close date picker
export function closeDatePicker() {
  document.getElementById('date-picker-overlay').classList.remove('show')
  document.getElementById('date-picker').classList.remove('show')
  currentCallback = null
}

// Render calendar days
function renderDays() {
  const title = document.getElementById('date-picker-title')
  const container = document.getElementById('date-picker-days')

  title.textContent = `${months[viewDate.getMonth()]} ${viewDate.getFullYear()}`

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // First day of month
  const firstDay = new Date(year, month, 1)
  const startDay = firstDay.getDay() // 0 = Sunday

  // Last day of month
  const lastDay = new Date(year, month + 1, 0)
  const totalDays = lastDay.getDate()

  // Previous month days to show
  const prevMonthLastDay = new Date(year, month, 0).getDate()

  // Today for comparison
  const today = new Date()
  const todayStr = formatDateValue(today)

  let html = ''

  // Previous month days
  for (let i = startDay - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const date = new Date(year, month - 1, day)
    const dateStr = formatDateValue(date)
    html += `<button type="button" class="date-picker__day other-month" data-date="${dateStr}">${day}</button>`
  }

  // Current month days
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day)
    const dateStr = formatDateValue(date)
    let classes = 'date-picker__day'

    if (dateStr === todayStr) classes += ' today'
    if (dateStr === selectedDate) classes += ' selected'

    html += `<button type="button" class="${classes}" data-date="${dateStr}">${day}</button>`
  }

  // Next month days to fill grid (6 rows × 7 days = 42)
  const totalCells = 42
  const filledCells = startDay + totalDays
  const remaining = totalCells - filledCells

  for (let day = 1; day <= remaining; day++) {
    const date = new Date(year, month + 1, day)
    const dateStr = formatDateValue(date)
    html += `<button type="button" class="date-picker__day other-month" data-date="${dateStr}">${day}</button>`
  }

  container.innerHTML = html
}
