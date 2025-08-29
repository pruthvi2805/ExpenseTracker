import { useEffect, useRef, useState } from 'react'
import { useMonth } from '../lib/useMonth.js'
import { Actuals as ActualsStore, Plan as PlanStore, Settings as SettingsStore } from '../lib/db.js'
import { leaves as taxLeaves } from '../lib/taxonomy.js'

export default function Actuals() {
  const { monthKey } = useMonth()
  const [cats, setCats] = useState([])
  const [data, setData] = useState({})
  const [plan, setPlan] = useState({})
  const [currency, setCurrency] = useState('EUR')
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef(null)

  const load = async () => {
    const [a, p] = await Promise.all([ActualsStore.get(monthKey), PlanStore.get(monthKey)])
    setData(a.data || {})
    setPlan(p.data || {})
    setCats(taxLeaves())
    const s = await SettingsStore.get(); setCurrency(s.currency || 'EUR')
  }
  useEffect(() => { load() }, [monthKey])

  const fixedCats = cats.filter(c=>!c.variable)
  const variableCats = cats.filter(c=>c.variable)
  const totalFixed = fixedCats.reduce((a,c)=> a + Number(data[c.id]||0), 0)
  const totalVariable = variableCats.reduce((a,c)=> a + Number(data[c.id]||0), 0)
  const total = totalFixed + totalVariable

  async function save(){
    setSaving(true)
    await ActualsStore.set(monthKey, normalizeData(data))
    setSaving(false)
  }
  async function clear(){ await ActualsStore.clear(monthKey); setData({}) }

  // Auto-save on changes (debounced)
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
          <h2 className="font-semibold">Monthly Spend</h2>
          <span className={`text-xs ${saving ? 'text-gray-500' : 'text-emerald-600'}`}>{saving ? 'Saving…' : 'All changes saved'}</span>
        </div>
        <p className="text-sm text-gray-600 mb-4">Enter what you actually spent this month for each subcategory. Planned shows your target from the Plan page; Δ is Actual minus Planned (red means over plan).</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActualsTable title="Fixed" cats={fixedCats} data={data} setData={setData} plan={plan} currency={currency} />
          <ActualsTable title="Variable" cats={variableCats} data={data} setData={setData} plan={plan} currency={currency} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">Combined total: <b>{money(total, currency)}</b></div>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded border text-sm" onClick={clear}>Clear</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActualsTable({ title, cats, data, setData, plan, currency }){
  const subtotal = cats.reduce((a,c)=> a + Number(data[c.id]||0), 0)
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <div className="text-xs text-gray-600">Subtotal: <b>{money(subtotal, currency)}</b></div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-1">Subcategory</th>
            <th className="text-right w-32">Actual</th>
            <th className="text-right w-32">Planned</th>
            <th className="text-right w-24">Δ</th>
          </tr>
        </thead>
        <tbody>
          {cats.length === 0 && (
            <tr><td colSpan="4" className="text-center text-gray-500 py-4">No categories</td></tr>
          )}
          {cats.map((c) => {
            const actual = Number(data[c.id] || 0)
            const planned = Number(plan[c.id] || 0)
            const diff = Number((actual - planned).toFixed(2))
            const cls = diff > 0 ? 'text-red-600' : diff < 0 ? 'text-emerald-600' : 'text-gray-600'
            const near = planned > 0 && actual >= 0.8 * planned && actual < planned
            return (
              <tr key={c.id} className={`border-t ${diff>0 ? 'bg-red-50' : near ? 'bg-amber-50' : ''}`}>
                <td className="py-1">{c.name}</td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-gray-500">{symbol(currency)}</span>
                    <input aria-label={`Actual spent for ${c.name}`} title={`Enter actual spend for ${c.name} in ${currency}`} type="number" step="0.01" className="border rounded px-2 py-1 w-28 text-right" value={data[c.id] ?? ''} onChange={(e)=>setData({...data,[c.id]: e.target.value})} />
                  </div>
                </td>
                <td className="text-right text-gray-500 w-32">{money(planned, currency)}</td>
                <td className={`text-right ${cls}`}>{money(diff, currency)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
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

function money(v, currency='EUR'){
  const n = Number(v || 0)
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
}

function symbol(currency){
  try {
    const parts = new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0)
    const sym = parts.find(p=>p.type==='currency')?.value
    return sym || currency
  } catch { return currency }
}
