import localforage from 'localforage'
import { parseISO, isValid as isValidDate } from 'date-fns'

const stores = {
  categories: localforage.createInstance({ name: 'pf', storeName: 'categories' }),
  incomes: localforage.createInstance({ name: 'pf', storeName: 'incomes' }),
  expenses: localforage.createInstance({ name: 'pf', storeName: 'expenses' }),
  incomeTotals: localforage.createInstance({ name: 'pf', storeName: 'incomeTotals' }),
  actuals: localforage.createInstance({ name: 'pf', storeName: 'actuals' }),
  plans: localforage.createInstance({ name: 'pf', storeName: 'plans' }),
  settings: localforage.createInstance({ name: 'pf', storeName: 'settings' }),
  meta: localforage.createInstance({ name: 'pf', storeName: 'meta' })
}

function uid() {
  try {
    // Modern browsers
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {}
  // Fallback: timestamp + random
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export async function list(store) {
  const out = []
  await stores[store].iterate((v) => out.push(v))
  return out
}

export async function get(store, id) {
  return stores[store].getItem(id)
}

async function nextId(store) {
  const key = `seq:${store}`
  const cur = (await stores.meta.getItem(key)) || 0
  const next = cur + 1
  await stores.meta.setItem(key, next)
  return `${store}:${next}`
}

export async function put(store, value, id = value.id) {
  let key = id
  if (!key) key = await nextId(store)
  else {
    const exists = await stores[store].getItem(key)
    if (exists) key = await nextId(store)
  }
  const item = { ...value, id: key }
  await stores[store].setItem(key, item)
  return item
}

export async function del(store, id) {
  await stores[store].removeItem(id)
}

// Domain-specific helpers
export const Category = {
  async all() {
    let arr = await list('categories')
    if (arr.length === 0) {
      await this.seedDefaults()
      arr = await list('categories')
    } else {
      // ensure there is an 'Other' group and subcategory
      const hasOtherGroup = arr.some((c) => !c.parentId && c.name.toLowerCase() === 'other')
      if (!hasOtherGroup) {
        const g = await put('categories', { id: uid(), name: 'Other', type: 'expense', order: Date.now(), parentId: null })
        await put('categories', { id: uid(), name: 'Other', type: 'expense', order: Date.now()+1, parentId: g.id })
        arr = await list('categories')
      } else {
        const group = arr.find((c)=>!c.parentId && c.name.toLowerCase()==='other')
        const hasOtherLeaf = arr.some((c)=>c.parentId===group.id && c.name.toLowerCase()==='other')
        if (!hasOtherLeaf) {
          await put('categories', { id: uid(), name: 'Other', type: 'expense', order: Date.now(), parentId: group.id })
          arr = await list('categories')
        }
      }
    }
    return arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  },
  async create({ name, type = 'expense', order = Date.now(), parentId = null }) {
    name = name?.trim()
    if (!name) throw new Error('Category name required')
    return put('categories', { id: uid(), name, type, order, parentId })
  },
  async update(id, patch) {
    const cur = await get('categories', id)
    if (!cur) throw new Error('Not found')
    return put('categories', { ...cur, ...patch }, id)
  },
  async remove(id) {
    // Guard: prevent deleting parent with children
    const all = await this.all()
    if (all.some((c) => c.parentId === id)) {
      throw new Error('Cannot delete: remove subcategories first')
    }
    // Guard: category in use by expenses or plan
    const exps = await Expense.all()
    if (exps.some((e) => e.categoryId === id)) {
      throw new Error('Category in use by expenses')
    }
    const plans = await Plan.allMonths()
    if (plans.some((p) => p.data && p.data[id] > 0)) {
      throw new Error('Category in use by plan')
    }
    await del('categories', id)
  }
  ,
  async seedDefaults() {
    const structure = [
      { name: 'Housing', children: ['Mortgage / Rent','Housing association / HOA fees'] },
      { name: 'Insurance', children: ['Health insurance','Car insurance','Liability / Legal insurance','Home contents insurance','Life insurance'] },
      { name: 'Utilities', children: ['Energy','Water','Internet','Mobile phone'] },
      { name: 'Subscriptions', children: ['Appliance / equipment rental','Streaming & digital services','Smart home/security subscriptions'] },
      { name: 'Taxes & Government Fees', children: ['Municipal / property tax','Road / vehicle tax','Water board / local authority charges'] },
      { name: 'Loans & Debt', children: ['Personal loans','Car loans / leases','Credit card repayments'] },
      { name: 'Banking Fees', children: ['Account fees','Credit card annual/monthly fees'] },
      { name: 'Living Expenses', children: ['Groceries','Dining out & delivery','Transport','Entertainment & shopping','Health & personal care'] },
      { name: 'Special Allocations', children: ['Unexpected / yearly fund','Investments / savings'] },
      { name: 'Other', children: ['Other'] },
    ]
    let order = Date.now()
    for (const g of structure) {
      const group = await put('categories', { id: uid(), name: g.name, type: 'expense', order: order, parentId: null })
      order += 1
      for (const ch of g.children) {
        await put('categories', { id: uid(), name: ch, type: 'expense', order: order, parentId: group.id })
        order += 1
      }
    }
  }
}

export const Income = {
  async all() {
    return (await list('incomes')).sort((a, b) => a.date.localeCompare(b.date))
  },
  async byMonth(monthKey) {
    const all = await this.all()
    return all.filter((i) => i.monthKey ? i.monthKey === monthKey : (i.date || '').startsWith(monthKey))
  },
  async create({ monthKey, date, source, amount, account, notes }) {
    if (!monthKey) throw new Error('Month required')
    if (date) validateDate(date)
    const amt = validateAmount(amount)
    if (!source?.trim()) throw new Error('Source required')
    return put('incomes', { monthKey, date: date || `${monthKey}-01`, source: source.trim(), amount: amt, account, notes, createdAt: Date.now() })
  },
  async update(id, patch) {
    const cur = await get('incomes', id)
    if (!cur) throw new Error('Not found')
    if (patch.date) validateDate(patch.date)
    if (patch.amount != null) patch.amount = validateAmount(patch.amount)
    return put('incomes', { ...cur, ...patch }, id)
  },
  async remove(id) { await del('incomes', id) }
}

export const Expense = {
  async all() {
    return (await list('expenses')).sort((a, b) => {
      const ca = Number(a.createdAt || 0), cb = Number(b.createdAt || 0)
      if (cb !== ca) return cb - ca
      const da = String(a.date || ''), db = String(b.date || '')
      const d = db.localeCompare(da)
      return d !== 0 ? d : String(b.id).localeCompare(String(a.id))
    })
  },
  async byMonth(monthKey) {
    const all = await this.all()
    return all.filter((e) => e.monthKey ? e.monthKey === monthKey : (e.date || '').startsWith(monthKey))
  },
  async create({ monthKey, date, description, amount, categoryId, label, account, notes }) {
    // date is optional; monthKey is required
    if (!monthKey) throw new Error('Month required')
    if (date) validateDate(date)
    const amt = validateAmount(amount)
    if (!categoryId) throw new Error('Category required')
    const payload = {
      id: uid(),
      monthKey,
      date: date || `${monthKey}-01`,
      description: (description || '').trim(),
      amount: amt,
      categoryId,
      account,
      notes,
      createdAt: Date.now()
    }
    return put('expenses', payload)
  },
  async update(id, patch) {
    const cur = await get('expenses', id)
    if (!cur) throw new Error('Not found')
    if (patch.date) validateDate(patch.date)
    if (patch.amount != null) patch.amount = validateAmount(patch.amount)
    return put('expenses', { ...cur, ...patch }, id)
  },
  async remove(id) { await del('expenses', id) }
}

export const Plan = {
  key(monthKey) { return `plan:${monthKey}` },
  async get(monthKey) {
    return (await stores.plans.getItem(this.key(monthKey))) || { monthKey, data: {} }
  },
  async set(monthKey, data) {
    await stores.plans.setItem(this.key(monthKey), { monthKey, data })
  },
  async clear(monthKey) { await stores.plans.removeItem(this.key(monthKey)) },
  async allMonths() {
    const out = []
    await stores.plans.iterate((v) => out.push(v))
    return out
  }
}

export const Actuals = {
  key(monthKey) { return `actuals:${monthKey}` },
  async get(monthKey) {
    return (await stores.actuals.getItem(this.key(monthKey))) || { monthKey, data: {} }
  },
  async set(monthKey, data) {
    await stores.actuals.setItem(this.key(monthKey), { monthKey, data })
  },
  async clear(monthKey) { await stores.actuals.removeItem(this.key(monthKey)) },
  async allMonths() {
    const out = []
    await stores.actuals.iterate((v) => out.push(v))
    return out
  }
}

// Income totals per month (five fixed sources)
export const IncomeTotals = {
  key(monthKey) { return `incomeTotals:${monthKey}` },
  async get(monthKey) {
    return (await stores.incomeTotals.getItem(this.key(monthKey))) || { monthKey, data: {} }
  },
  async set(monthKey, data) {
    await stores.incomeTotals.setItem(this.key(monthKey), { monthKey, data })
  },
  async clear(monthKey) { await stores.incomeTotals.removeItem(this.key(monthKey)) }
}

// Custom user-defined subcategories per section
export const CustomCats = {
  async list() {
    const list = []
    if (!stores.customCats) stores.customCats = localforage.createInstance({ name: 'pf', storeName: 'customCats' })
    await stores.customCats.iterate((v)=>list.push(v))
    return list // [{id,name,section,variable:false|true}]
  },
  async add(section, name){
    if (!stores.customCats) stores.customCats = localforage.createInstance({ name: 'pf', storeName: 'customCats' })
    name = (name||'').trim()
    if (!name) throw new Error('Name required')
    const id = await nextId(`custom:${section}`)
    const variable = section === 'variable'
    const item = { id, name, section, variable }
    await stores.customCats.setItem(id, item)
    return item
  },
  async remove(id){ if (!stores.customCats) stores.customCats = localforage.createInstance({ name: 'pf', storeName: 'customCats' }); await stores.customCats.removeItem(id) }
}

export async function exportAll() {
  const [plans, actuals, incomes, settings, customCats, incomeTotals] = await Promise.all([
    (async () => { const list = []; await stores.plans.iterate((v)=>list.push(v)); return list })(),
    (async () => { const list = []; await stores.actuals.iterate((v)=>list.push(v)); return list })(),
    (async () => { const list = []; await stores.incomes.iterate((v)=>list.push(v)); return list })(),
    stores.settings.getItem('settings').then((v)=>v||{}),
    (async ()=>{ if(!stores.customCats) stores.customCats = localforage.createInstance({name:'pf',storeName:'customCats'}); const list=[]; await stores.customCats.iterate(v=>list.push(v)); return list })(),
    (async () => { const list = []; await stores.incomeTotals.iterate((v)=>list.push(v)); return list })()
  ])
  return { version: 1, exportedAt: Date.now(), plans, actuals, incomes, settings, customCats, incomeTotals }
}

export async function importAll(payload, { merge = false } = {}) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid backup')
  const { plans = [], actuals = [], incomes = [], settings = {}, customCats = [], incomeTotals = [] } = payload
  if (!merge) {
    await Promise.all([
      stores.plans.clear(),
      stores.actuals.clear(),
      stores.incomes.clear(),
      (async()=>{ if(!stores.customCats) stores.customCats = localforage.createInstance({name:'pf',storeName:'customCats'}); await stores.customCats.clear() })()
    ])
  }
  for (const p of plans) await stores.plans.setItem(Plan.key(p.monthKey), p)
  for (const a of actuals) await stores.actuals.setItem(Actuals.key(a.monthKey), a)
  for (const i of incomes) await stores.incomes.setItem(i.id || await nextId('incomes'), i)
  await stores.settings.setItem('settings', settings)
  if (!stores.customCats) stores.customCats = localforage.createInstance({name:'pf',storeName:'customCats'})
  for (const c of customCats) await stores.customCats.setItem(c.id || await nextId(`custom:${c.section||'fixed'}`), c)
  for (const t of incomeTotals) await stores.incomeTotals.setItem(IncomeTotals.key(t.monthKey), t)
}

export const Settings = {
  async get() {
    const cur = (await stores.settings.getItem('settings')) || {}
    // Backward compatibility for previous field names
    const currency = cur.currency || 'EUR'
    const salaryDay = cur.salaryDay ?? 1
    const minSavings = cur.minSavings ?? cur.bufferMin ?? 0
    const currentSavings = cur.currentSavings ?? cur.bufferNow ?? 0
    const startMonth = cur.startMonth ?? null
    return { currency, salaryDay, minSavings, currentSavings, startMonth }
  },
  async set(patch) {
    const cur = await this.get()
    const next = { ...cur, ...patch }
    await stores.settings.setItem('settings', next)
    return next
  }
}

export function validateDate(date) {
  const d = parseISO(date)
  if (!isValidDate(d) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date YYYY-MM-DD')
  }
  return date
}

export function validateAmount(input) {
  const n = typeof input === 'number' ? input : Number(String(input).replace(/,/g, ''))
  if (!isFinite(n) || n <= 0) throw new Error('Amount must be positive')
  return Number(n.toFixed(2))
}
