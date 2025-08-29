import { useEffect, useRef, useState } from 'react'
import { useMonth } from '../lib/useMonth.js'
import { Plan as PlanStore, Settings as SettingsStore } from '../lib/db.js'
import { leaves as taxLeaves } from '../lib/taxonomy.js'
import { emit, Events } from '../lib/bus.js'

export default function Plan() {
  const { monthKey } = useMonth()
  const [cats, setCats] = useState([])
  const [data, setData] = useState({})
  const [currency, setCurrency] = useState('EUR')
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef(null)

  const load = async () => {
    const p = await PlanStore.get(monthKey)
    setCats(taxLeaves()); setData(p.data || {})
  }
  useEffect(() => { load() }, [monthKey])
  useEffect(() => { SettingsStore.get().then(s=>setCurrency(s.currency || 'EUR')) }, [])

  const total = Object.values(data).reduce((a, b) => a + Number(b || 0), 0)
  const fixedCats = cats.filter(c=>!c.variable)
  const variableCats = cats.filter(c=>c.variable)
  const totalFixed = fixedCats.reduce((a,c)=> a + Number(data[c.id]||0), 0)
  const totalVariable = variableCats.reduce((a,c)=> a + Number(data[c.id]||0), 0)

  async function save() {
    setSaving(true)
    await PlanStore.set(monthKey, normalizeData(data))
    emit(Events.DataChanged)
    setSaving(false)
  }
  async function clear() {
    await PlanStore.clear(monthKey); setData({}); emit(Events.DataChanged)
  }

  // Auto-save on change (debounced)
  useEffect(() => {
    if (!cats.length) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { save() }, 500)
    return () => saveTimer.current && clearTimeout(saveTimer.current)
  }, [data])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Monthly Plan</h2>
          <span className={`text-xs ${saving ? 'text-gray-500' : 'text-emerald-600'}`}>{saving ? 'Saving…' : 'All changes saved'}</span>
        </div>
        <p className="text-sm text-gray-600 mb-4">Set your target spend per subcategory for the selected month. Fixed costs recur monthly; Variable costs can change. Totals update automatically.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PlanTable title="Fixed" cats={fixedCats} data={data} setData={setData} currency={currency} total={totalFixed} />
          <PlanTable title="Variable" cats={variableCats} data={data} setData={setData} currency={currency} total={totalVariable} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">Combined total: <b>{money(total, currency)}</b></div>
          <div className="flex gap-2">
            <CopyPrev monthKey={monthKey} setData={setData} />
            <button className="px-3 py-1 rounded border text-sm" onClick={clear}>Clear</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function normalizeData(d) {
  const res = {}
  for (const [k, v] of Object.entries(d)) {
    const n = Number(v)
    if (isFinite(n) && n > 0) res[k] = Number(n.toFixed(2))
  }
  return res
}

function money(v, currency='EUR') {
  const n = Number(v || 0)
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
}

// taxonomy helpers removed; using from taxonomy.js

function PlanTable({ title, cats, data, setData, currency, total }){
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <div className="text-xs text-gray-600">Subtotal: <b>{money(total, currency)}</b></div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-1">Subcategory</th>
            <th className="text-right w-32">Planned amount</th>
          </tr>
        </thead>
        <tbody>
          {cats.length === 0 && (
            <tr><td colSpan="2" className="text-center text-gray-500 py-4">No categories</td></tr>
          )}
          {cats.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="py-1">{c.name}</td>
              <td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <span className="text-gray-500">{symbol(currency)}</span>
                  <input aria-label={`Planned amount for ${c.name}`} title={`Enter planned monthly amount for ${c.name} in ${currency}`} type="number" step="0.01" className="border rounded px-2 py-1 w-28 text-right" value={data[c.id] ?? ''} onChange={(e)=>setData({...data,[c.id]: e.target.value})} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CopyPrev({ monthKey, setData }){
  async function copy(){
    try {
      const [y,m] = monthKey.split('-').map(Number)
      const prev = new Date(y, m-2, 1)
      const prevKey = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`
      const prevPlan = await PlanStore.get(prevKey)
      if (prevPlan && prevPlan.data) setData(prevPlan.data)
    } catch (e) { void e }
  }
  return <button className="px-3 py-1 rounded border text-sm" onClick={copy} title="Copy previous month's plan into this month">Copy last month</button>
}

function symbol(currency){
  try {
    const parts = new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0)
    const sym = parts.find(p=>p.type==='currency')?.value
    return sym || currency
  } catch { return currency }
}
