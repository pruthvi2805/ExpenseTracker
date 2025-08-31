import { useEffect, useMemo, useState } from 'react'
import { PlusIcon, XMarkIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { useMonth } from '../lib/useMonth.js'
import { Actuals as ActualsStore, Settings as SettingsStore, CustomCats } from '../lib/db.js'
import { leaves as taxLeaves, labelFor } from '../lib/taxonomy.js'
import CurrencyInput from './CurrencyInput.jsx'
import { emit, Events } from '../lib/bus.js'
import { LOCAL_STORAGE_KEYS, NUMERIC_CONSTANTS } from '../lib/constants.js'
import Decimal from 'decimal.js'

export default function QuickCapture(){
  const [open, setOpen] = useState(false)
  useEffect(()=>{
    const onKey = (e)=>{
      if (e.key.toLowerCase()==='a' && !e.ctrlKey && !e.metaKey && !e.altKey){ e.preventDefault(); setOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  },[])
  return <>
    <button
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      title="Quick add (A)"
      aria-label="Quick add"
      onClick={()=>setOpen(true)}
    >
      <PlusIcon className="w-6 h-6"/>
    </button>
    {open && <QuickCaptureModal onClose={()=>setOpen(false)} />}
  </>
}

function QuickCaptureModal({ onClose }){
  const { monthKey } = useMonth()
  const [currency, setCurrency] = useState('EUR')
  const [options, setOptions] = useState([])
  const [query, setQuery] = useState('')
  const [catId, setCatId] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(()=> new Date().toISOString().slice(0,10))
  const [saving, setSaving] = useState(false)

  useEffect(()=>{ SettingsStore.get().then(s=> setCurrency(s.currency||'EUR')) },[])
  useEffect(()=>{
    const load = async ()=>{
      const custom = await CustomCats.list()
      const all = [...taxLeaves(), ...custom]
      const opts = all.map(l=> ({ id: l.id, label: labelFor(l) }))
      setOptions(opts)
    }
    load()
  },[])

  const results = useMemo(()=>{
    const q = query.trim().toLowerCase()
    const recents = getRecents()
    const sorted = [...options].sort((a,b)=>{
      const ai = recents.indexOf(a.id); const bi = recents.indexOf(b.id)
      const ar = ai===-1? 999 : ai; const br = bi===-1? 999 : bi
      if (ar !== br) return ar - br
      return a.label.localeCompare(b.label)
    })
    if (!q) return sorted.slice(0,20)
    return sorted.filter(o=> o.label.toLowerCase().includes(q)).slice(0,20)
  },[options, query])

  function pick(id){ setCatId(id) }

  async function save(){
    const n = new Decimal(amount || 0)
    if (!n.isFinite() || n.lessThanOrEqualTo(0)) return
    if (!catId) return
    setSaving(true)
    try {
      const cur = await ActualsStore.get(monthKey)
      const data = { ...(cur.data||{}) }
      data[catId] = new Decimal(data[catId]||0).plus(n).toDecimalPlaces(2).toNumber()
      await ActualsStore.set(monthKey, data)
      pushRecent(catId)
      emit(Events.DataChanged)
      onClose?.()
    } finally { setSaving(false) }
  }

  function onKeyDown(e){
    if (e.key === 'Enter') { e.preventDefault(); save() }
    if (e.key === 'Escape') { e.preventDefault(); onClose?.() }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3" role="dialog" aria-modal="true" onKeyDown={onKeyDown}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Quick Capture</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close"><XMarkIcon className="w-5 h-5"/></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Amount</label>
            <CurrencyInput currency={currency} value={amount} onChange={setAmount} ariaLabel="Amount" title="Enter amount" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <input className="input w-full" placeholder="Search category…" value={query} onChange={(e)=>{ setQuery(e.target.value); setCatId('') }} />
            <div className="mt-2 max-h-40 overflow-auto border rounded">
              {results.map(o=> (
                <button key={o.id} className={`block w-full text-left px-2 py-1 text-sm hover:bg-indigo-50 ${catId===o.id?'bg-indigo-50':''}`} onClick={()=>{ pick(o.id); setQuery(o.label) }}>{o.label}</button>
              ))}
              {results.length===0 && <div className="px-2 py-2 text-sm text-gray-500">No matches</div>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1 inline-flex items-center gap-1"><CalendarDaysIcon className="w-4 h-4"/>Date</label>
              <input type="date" className="input w-full" value={date} onChange={(e)=>setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
              <input className="input w-full" value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="eg. groceries top-up" />
            </div>
          </div>
          <div className="pt-1 flex items-center justify-end gap-2">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving || !amount || !catId}>{saving? 'Saving…':'Save'}</button>
          </div>
          <p className="text-[11px] text-gray-500">Tip: press A to open, Enter to save.</p>
        </div>
      </div>
    </div>
  )
}

function getRecents(){
  try { return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.QUICK_CAPTURE_RECENT)||'[]') } catch { return [] }
}
function pushRecent(id){
  try {
    const list = getRecents().filter(x=>x!==id)
    list.unshift(id)
    localStorage.setItem(LOCAL_STORAGE_KEYS.QUICK_CAPTURE_RECENT, JSON.stringify(list.slice(0,NUMERIC_CONSTANTS.RECENT_MAX)))
  } catch { /* no-op */ }
}
