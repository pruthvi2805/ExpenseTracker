import { useEffect, useState } from 'react'
import { Settings as SettingsStore, exportAll, importAll } from '../lib/db.js'
import { showToast } from '../lib/toast.js'
import { emit, Events } from '../lib/bus.js'
import { Cog6ToothIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { useMonth } from '../lib/useMonth.js'
import { Plan as PlanStore, Actuals as ActualsStore } from '../lib/db.js'
import { leaves as taxLeaves } from '../lib/taxonomy.js'

export default function Settings() {
  const { monthKey } = useMonth()
  const [s, setS] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => { SettingsStore.get().then(setS) }, [])

  if (!s) return <div className="text-sm text-gray-500">Loading…</div>

  async function save(e) {
    e.preventDefault()
    await SettingsStore.set({
      currency: s.currency,
      salaryDay: Number(s.salaryDay),
      minSavings: Number(s.minSavings),
      currentSavings: Number(s.currentSavings),
      startMonth: s.startMonth || null
    })
    setSaved(true); setTimeout(()=>setSaved(false), 1500)
    emit(Events.SettingsChanged); emit(Events.DataChanged)
  }

  return (
    <div className="space-y-6">
      <div className="tile">
        <h2 className="font-semibold mb-3 inline-flex items-center gap-2 pb-1 border-b border-indigo-100"><Cog6ToothIcon className="w-5 h-5"/>Settings</h2>
        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500">Currency</label>
            <select className="select" value={s.currency} onChange={(e)=>setS({...s,currency:e.target.value})}>
            <option value="EUR">EUR — Euro</option>
            <option value="USD">USD — US Dollar</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="INR">INR — Indian Rupee</option>
            <option value="AUD">AUD — Australian Dollar</option>
            <option value="CAD">CAD — Canadian Dollar</option>
          </select>
            <p className="text-[11px] text-gray-500 mt-1">Controls symbols and formatting across the app.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Salary Day</label>
            <input type="number" min="1" max="28" step="1" className="input" value={s.salaryDay} onChange={(e)=>{
            const v = Number(e.target.value)
            if (Number.isNaN(v)) return; if (v<1||v>28) return; setS({...s,salaryDay:v})
          }} />
            <p className="text-[11px] text-gray-500 mt-1">Optional reference day (reserved for future reminders).</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Minimum Savings</label>
            <input type="number" step="0.01" min="0" className="input" value={s.minSavings} onChange={(e)=>{
            const v=e.target.value; if(v===''||/^\d*(?:\.\d{0,2})?$/.test(v)) setS({...s,minSavings:v})
          }} />
            <p className="text-[11px] text-gray-500 mt-1">The lowest cash savings you’re comfortable going down to.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Current Savings</label>
            <input type="number" step="0.01" min="0" className="input" value={s.currentSavings} onChange={(e)=>{
            const v=e.target.value; if(v===''||/^\d*(?:\.\d{0,2})?$/.test(v)) setS({...s,currentSavings:v})
          }} />
            <p className="text-[11px] text-gray-500 mt-1">Your current cash savings. Used to compute <i>After Month (Cash) = Current + Net Cash</i>.</p>
          </div>
          {/* Start Month removed as it has no functional impact */}
          <div className="md:col-span-2 mt-2">
            <button className="btn-primary">Save</button>
            {saved && <span className="ml-2 text-xs text-emerald-600">Saved</span>}
          </div>
        </form>
      </div>

      <div className="tile">
        <h3 className="font-semibold mb-2">Backup</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="btn" onClick={async()=>{
            const data = await exportAll();
            const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `pf-backup-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url)
          }}><ArrowDownTrayIcon className="w-4 h-4"/>Export JSON</button>
          <label className="text-sm cursor-pointer inline-flex items-center gap-2">
            <span className="btn"><ArrowUpTrayIcon className="w-4 h-4"/>Import JSON</span>
            <input type="file" accept="application/json" className="hidden" onChange={async(e)=>{
              const file = e.target.files?.[0]; if(!file) return;
              const txt = await file.text();
              try {
                const before = await exportAll()
                await importAll(JSON.parse(txt));
                showToast({ message: 'Imported backup', actionLabel: 'Undo', onAction: async()=>{ await importAll(before); location.reload() } })
                location.reload()
              } catch { alert('Invalid backup file') }
            }} />
          </label>
          <button className="btn" onClick={async()=>{
            // Export CSV for current month: Category, Section, Planned, Actual, Delta
            const [p,a] = await Promise.all([PlanStore.get(monthKey), ActualsStore.get(monthKey)])
            const leaves = taxLeaves()
            const map = Object.fromEntries(leaves.map(l=>[l.id,l]))
            const rows = [['Category','Section','Planned','Actual','Delta']]
            const ids = new Set([...Object.keys(p.data||{}), ...Object.keys(a.data||{})])
            for (const id of ids){
              const info = map[id]
              if (!info) continue
              const planned = Number(p.data?.[id]||0)
              const actual = Number(a.data?.[id]||0)
              const delta = Number((actual - planned).toFixed(2))
              rows.push([info.name, info.section, planned.toFixed(2), actual.toFixed(2), delta.toFixed(2)])
            }
            const csv = rows.map(r=> r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n')
            const blob = new Blob([csv],{type:'text/csv'})
            const url = URL.createObjectURL(blob)
            const ael = document.createElement('a')
            ael.href = url; ael.download = `pf-${monthKey}.csv`; ael.click(); URL.revokeObjectURL(url)
          }}>Export CSV (this month)</button>
          <p className="text-xs text-gray-500">Export creates a local file you can store safely. Import replaces your current data. CSV export uses the selected month on the header.</p>
        </div>
      </div>
    </div>
  )
}
