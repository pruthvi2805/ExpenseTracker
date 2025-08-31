export const LOCAL_STORAGE_KEYS = {
  MONTH_KEY: 'pf-month',
  BUDGET_TAB: 'pf-budget-tab',
  HIDE_EMPTY_ROWS: 'pf-hideEmptyRows',
  LEGACY_HIDE_ZERO: 'pf-budget-hideZero',
  ROLLOVER_SEEN: 'pf-rollover:',
  QUICK_CAPTURE_RECENT: 'pf-quick-capture-recent',
};

export const NUMERIC_CONSTANTS = {
  RECENT_MAX: 5,
  SAVE_DEBOUNCE_MS: 500,
  SAVED_MESSAGE_DURATION_MS: 1500,
  SALARY_DAY_MIN: 1,
  SALARY_DAY_MAX: 31, // Changed from 28 to 31 for better flexibility
  DEFAULT_DAYS_IN_MONTH: 30,
};

export const DATE_FORMATS = {
  MONTH_KEY: 'yyyy-MM',
  ISO_DATE: 'yyyy-MM-dd',
};

export const CATEGORY_SECTIONS = {
  FIXED: 'fixed',
  VARIABLE: 'variable',
  LOANS: 'loans',
  ALLOCATIONS: 'allocations',
};

export const CURRENCIES = {
  EUR: 'EUR',
  USD: 'USD',
  GBP: 'GBP',
  INR: 'INR',
  AUD: 'AUD',
  CAD: 'CAD',
};

export const TOAST_DEFAULTS = {
  MESSAGE_DURATION: 3000, // Default toast message duration
};
