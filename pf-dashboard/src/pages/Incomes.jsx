import { useEffect, useState } from 'react'
import { Income, IncomeTotals, Settings as SettingsStore } from '../lib/db.js'
import CurrencyInput from '../components/CurrencyInput.jsx'
import { BanknotesIcon } from '@heroicons/react/24/outline'
import { useMonth } from '../lib/monthContext.jsx'
import { emit, Events } from '../lib/bus.js'

export default function Incomes() {
  const { monthKey } = useMonth()
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [currency, setCurrency] = useState('EUR')
  const [form, setForm] = useState({ source: 'Salary', amount: '', notes: '' })
  const [error, setError] = useState('')

  const load = async () => {
    const legacy = await Income.byMonth(monthKey)
    const totals = await IncomeTotals.get(monthKey)
    // derive rows from totals if any, else show empty rows
    const base = [
      { id: 'salary', label: 'Salary' },
      { id: 'rent', label: 'Rent' },
      { id: 'reimbursements', label: 'Reimbursements' },
      { id: 'investments', label: 'Investment returns' },
      { id: 'other', label: 'Other' }
    ]
    const rows = base.map(b => ({
      ...b,
      amount: totals.data?.[b.id]?.amount ?? '',
      notes: totals.data?.[b.id]?.notes ?? ''
    }))
    // If no totals yet and legacy exists, prefill sums once
    if (!Object.keys(totals.data||{}).length && legacy.length){
      const sums = {
        salary: 0, rent: 0, reimbursements: 0, investments: 0, other: 0
      }
      for (const it of legacy){
        const key = it.source?.toLowerCase().includes('salary') ? 'salary'
          : it.source?.toLowerCase().includes('rent') ? 'rent'
          : it.source?.toLowerCase().includes('reimb') ? 'reimbursements'
          : (it.source?.toLowerCase().includes('invest') || it.source?.toLowerCase().includes('dividend') || it.source?.toLowerCase().includes('interest')) ? 'investments'
          : 'other'
        sums[key] += Number(it.amount)||0
      }
      rows.forEach(r=> r.amount = sums[r.id] ? sums[r.id].toFixed(2) : '')
    }
    setItems(rows)
  }
  useEffect(() => { load() }, [monthKey])
  useEffect(() => { SettingsStore.get().then(s=>setCurrency(s.currency||'EUR')) }, [])

  async function saveTotals(mapping){
    setSaving(true)
    await IncomeTotals.set(monthKey, mapping)
    setSaving(false)
    setSavedAt(Date.now())
    emit(Events.DataChanged)
  }

  async function copyLastMonth(){
    const [y,m] = monthKey.split('-').map(Number)
    const prev = new Date(y, m-2, 1)
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`
    const prevItems = await Income.byMonth(prevKey)
    for (const it of prevItems){
      await Income.create({ monthKey, source: it.source, amount: it.amount, notes: it.notes })
    }
    await load(); emit(Events.DataChanged)
  }

  async function remove(id) {
    await Income.remove(id); await load(); emit(Events.DataChanged)
  }

  async function update(id, patch) {
    setError('')
    try {
      if (patch.amount != null) patch.amount = Number(patch.amount)
      await Income.update(id, patch); await load(); emit(Events.DataChanged)
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="space-y-4">
      <div className="tile tile-tight">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold inline-flex items-center gap-2"><BanknotesIcon className="w-5 h-5"/>Income</h2>
          <span className={`text-xs ${saving?'text-gray-500':'text-emerald-600'}`}>{saving ? 'Saving…' : (savedAt ? 'All changes saved' : '')}</span>
        </div>
        <p className="text-xs text-gray-600 mb-2">Enter monthly income per source. Leave blank for zero.</p>
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="text-left text-gray-500 bg-gray-50">
              <th className="py-1.5 px-2 w-64 rounded-l">Source</th>
              <th className="text-right py-1.5 px-2 w-40">Amount</th>
              <th className="py-1.5 px-2 rounded-r">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((r, idx) => (
              <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                <td className="py-1.5 px-2 w-64">{r.label}</td>
                <td className="text-right py-1.5 px-2 w-40">
                  <CurrencyInput
                    currency={currency}
                    value={items[idx].amount}
                    onChange={(v)=>{
                      const next = [...items]; next[idx] = { ...next[idx], amount: v }
                      setItems(next)
                      const mapping = Object.fromEntries(next.map(x=>[x.id,{ amount: x.amount, notes: x.notes }]))
                      saveTotals(mapping)
                    }}
                    ariaLabel={`Amount for ${r.label}`}
                    title={`Enter monthly amount for ${r.label} in ${currency}`}
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    className="input"
                    value={items[idx].notes}
                    placeholder={r.id==='other' ? 'Describe source' : 'Optional'}
                    onChange={(e)=>{
                      const v = e.target.value
                      const next = [...items]; next[idx] = { ...next[idx], notes: v }
                      setItems(next)
                      const mapping = Object.fromEntries(next.map(x=>[x.id,{ amount: x.amount, notes: x.notes }]))
                      saveTotals(mapping)
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 text-sm text-gray-700">Total Income: <b>{money(items.reduce((s,r)=> s + (Number(r.amount)||0), 0), currency)}</b></div>
      </div>
    </div>
  )
}

function money(v,currency='EUR'){ const n=Number(v||0); return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(n) }
