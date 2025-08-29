import { useEffect, useState } from 'react'
import { useMonth } from '../lib/useMonth.js'
import { Plan as PlanStore, Actuals as ActualsStore } from '../lib/db.js'
import { leaves } from '../lib/taxonomy.js'

export default function Onboarding(){
  const [open, setOpen] = useState(false)
  const { monthKey } = useMonth()
  useEffect(()=>{
    if (!localStorage.getItem('pf-onboarded')) setOpen(true)
  },[])
  if (!open) return null
  async function startFresh(){ localStorage.setItem('pf-onboarded','1'); setOpen(false) }
  async function loadSample(){
    try{
      const map = Object.fromEntries(leaves().map(l=>[l.id,0]))
      // A tiny sensible plan
      const set = (id,v)=>{ if (map[id]!=null) map[id]=v }
      set('living:groceries', 300); set('living:transport', 80); set('living:dining', 120)
      set('insurance:health', 50); set('utilities:energy', 70)
      set('allocations:investment', 100)
      await PlanStore.set(monthKey, map)
      await ActualsStore.set(monthKey, {})
    } finally { localStorage.setItem('pf-onboarded','1'); setOpen(false) }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-5">
        <h2 className="font-semibold text-lg mb-2">Welcome to Expense Tracker</h2>
        <p className="text-sm text-gray-700">Plan your month, record actuals, and track Net Cash. Data stays on your device.</p>
        <ol className="list-decimal pl-5 my-3 text-sm text-gray-700">
          <li><b>Budget</b>: Set Plan/Actuals; Allocations for savings/investments.</li>
          <li><b>Income</b>: Enter monthly totals per source.</li>
          <li><b>Dashboard</b>: See Spend, Net Cash, and Suggestions.</li>
        </ol>
        <div className="mt-3 flex gap-2 justify-end">
          <button className="btn" onClick={startFresh}>Start fresh</button>
          <button className="btn-primary" onClick={loadSample}>Load sample plan</button>
        </div>
      </div>
    </div>
  )
}

