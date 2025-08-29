import { useEffect, useState } from 'react'
import { useMonth } from '../lib/useMonth.js'
import { computeMonth } from '../lib/calc.js'
import { on, Events } from '../lib/bus.js'
import { Actuals, Plan } from '../lib/db.js'
import { isAllocationByLeafId } from '../lib/taxonomy.js'
import { BanknotesIcon, CalendarDaysIcon, ReceiptPercentIcon, ArrowTrendingUpIcon, InformationCircleIcon, ChartPieIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { monthKey } = useMonth()
  const [data, setData] = useState(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const res = await computeMonth(monthKey)
      if (mounted) setData(res)
    }
    load()
    const off = on(Events.DataChanged, load)
    return () => { mounted = false; off() }
  }, [monthKey])

  if (!data) return <div className="text-sm text-gray-500">Loading…</div>

  const tiles = [
    { label: 'Income', value: money(data.incomeTotal, data.currency), icon: <BanknotesIcon className="w-5 h-5"/> },
    { label: 'Planned Spend', value: money(data.plannedTotal, data.currency), icon: <CalendarDaysIcon className="w-5 h-5"/> },
    { label: 'Spend', value: money(data.expenseTotal, data.currency), icon: <ReceiptPercentIcon className="w-5 h-5"/> },
    { label: 'Net Cash', value: money(data.netCash, data.currency), cls: data.netCash >= 0 ? 'text-emerald-600' : 'text-red-600', icon: <ArrowTrendingUpIcon className={`w-5 h-5 ${data.netCash>=0?'text-emerald-600':'text-red-600'}`} /> }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="tile">
            <div className="tile-label">{t.icon}{t.label}</div>
            <div className={`text-2xl font-semibold ${t.cls || ''}`}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* Print moved to header */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="tile">
          <div className="flex items-center justify-between pb-1 mb-2 border-b border-indigo-100">
            <h2 className="font-semibold">Savings</h2>
            <span className="text-[11px] text-gray-500">ⓘ Current + Net Cash = After Month (Cash)</span>
          </div>
          <p className="text-sm">Current savings: <b>{money(data.savingsNow, data.currency)}</b></p>
          <p className="text-sm">After Month (Cash): <b className={data.savingsOk ? 'text-emerald-600' : 'text-red-600'}>{money(data.savingsAfterCash, data.currency)}</b> (minimum {money(data.savingsMin, data.currency)})</p>
        </div>
        <div className="tile">
          <div className="flex items-center justify-between pb-1 mb-2 border-b border-indigo-100">
            <h2 className="font-semibold">Budget Status</h2>
            <span className="text-[11px] text-gray-500 inline-flex items-center gap-1"><InformationCircleIcon className="w-4 h-4"/>Actual − Plan by section</span>
          </div>
          {data.deltaTotal > 0 && (
            <p className="text-sm text-red-600">Overbudget: <b>{money(data.deltaTotal, data.currency)}</b></p>
          )}
          {data.deltaTotal < 0 && (
            <p className="text-sm text-emerald-600">Underbudget: <b>{money(-data.deltaTotal, data.currency)}</b></p>
          )}
          {data.deltaTotal === 0 && (
            <p className="text-sm text-gray-600">On plan</p>
          )}
          <div className="mt-1 text-xs">
            <p className={`${clsDelta(data.deltaFixed)}`}>Fixed: <b>{fmtDelta(data.deltaFixed, data.currency)}</b></p>
            <p className={`${clsDelta(data.deltaVariable)}`}>Variable: <b>{fmtDelta(data.deltaVariable, data.currency)}</b></p>
            <p className={`${clsDelta(data.deltaLoans)}`}>Loans: <b>{fmtDelta(data.deltaLoans, data.currency)}</b></p>
            <p className={`mt-1 ${data.allocationsDelta>=0?'text-emerald-600':'text-red-600'}`}>Allocations: <b>{data.allocationsDelta>=0?'+':''}{money(data.allocationsDelta, data.currency)}</b> (higher is better)</p>
          </div>
        </div>
      </div>

      <div className="tile">
        <div className="flex items-center justify-between pb-1 mb-2 border-b border-indigo-100">
          <h2 className="font-semibold">Spend Mix</h2>
          <span className="text-[11px] text-gray-500 inline-flex items-center gap-1"><ChartPieIcon className="w-4 h-4"/>Actual spend split by section</span>
        </div>
        <div className="flex gap-6 text-sm mb-3">
          <div>Fixed: <b>{money(data.expenseFixed, data.currency)}</b></div>
          <div>Variable: <b>{money(data.expenseVariable, data.currency)}</b></div>
          <div>Loans: <b>{money(data.expenseLoans, data.currency)}</b></div>
        </div>
        <CollapsibleCategories data={data} />
      </div>

      <Trends monthKey={monthKey} currency={data.currency} />
    </div>
  )
}

function money(v, currency = 'USD') {
  const n = Number(v || 0)
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
}

function fmtDelta(v, currency){
  const n = Number(v||0)
  if (n === 0) return money(0, currency)
  const sign = n > 0 ? '' : '-'
  return sign + money(Math.abs(n), currency)
}

function clsDelta(v){
  const n = Number(v||0)
  if (n > 0) return 'text-red-600'
  if (n < 0) return 'text-emerald-600'
  return 'text-gray-600'
}

function Trends({ monthKey, currency }){
  const [rows, setRows] = useState([])
  useEffect(() => {
    const load = async () => {
      const res = []
      const base = new Date(Number(monthKey.slice(0,4)), Number(monthKey.slice(5,7))-1, 1)
      for (let i=2;i>=0;i--){
        const d = new Date(base)
        d.setMonth(d.getMonth()-i)
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
        const [a, p] = await Promise.all([Actuals.get(key), Plan.get(key)])
        const actual = Object.entries(a.data||{})
          .filter(([id])=>!isAllocationByLeafId(id))
          .reduce((s,[,v])=>s+Number(v||0),0)
        const planned = Object.entries(p.data||{})
          .filter(([id])=>!isAllocationByLeafId(id))
          .reduce((s,[,v])=>s+Number(v||0),0)
        res.push({ key, actual, planned })
      }
      setRows(res)
    }
    load()
  }, [monthKey])
  if (!rows.length) return null
  return (
    <div className="tile">
      <div className="flex items-center justify-between pb-1 mb-2 border-b border-indigo-100">
        <h2 className="font-semibold">3‑Month Trend</h2>
      </div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="min-w-[520px] w-full text-sm table-auto">
        <thead>
          <tr className="text-left text-gray-500 bg-gray-50">
            <th className="py-1.5 px-2 rounded-l w-32">Month</th>
            <th className="text-right py-1.5 w-1/4">Actual</th>
            <th className="text-right py-1.5 w-1/4">Planned</th>
            <th className="text-right py-1.5 rounded-r hidden sm:table-cell">Outcome</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(r => {
            const delta = Number((r.actual - r.planned).toFixed(2))
            const over = delta > 0, under = delta < 0
            const chip = over ? 'bg-red-100 text-red-700' : under ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
            const label = over ? 'Overbudget' : under ? 'Underbudget' : 'On plan'
            return (
              <>
              <tr key={r.key} className="even:bg-gray-50">
                <td className="py-1.5 px-2">{r.key}</td>
                <td className="text-right py-1.5 px-2">{money(r.actual, currency)}</td>
                <td className="text-right py-1.5 px-2">{money(r.planned, currency)}</td>
                <td className="text-right py-1.5 px-2 hidden sm:table-cell"><span className={`inline-block rounded-full px-2 py-0.5 text-xs ${chip}`}>{label}</span></td>
              </tr>
              <tr className="sm:hidden">
                <td className="py-1 px-2 text-right text-xs text-gray-600" colSpan="3">
                  <span className={`inline-block rounded-full px-2 py-0.5 ${chip}`}>{label}</span>
                </td>
              </tr>
              </>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}


function CollapsibleCategories({ data }){
  const [open, setOpen] = useState(false)
  const entries = Object.entries(data.spendByCategoryId)
  const colors = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#a855f7','#84cc16','#f97316']
  const total = entries.reduce((s,[,v])=> s + Number(v||0), 0)
  let current = 0
  const stops = entries.map(([cid,amt],i)=>{
    const val = Number(amt||0)
    const deg = total>0 ? (val/total)*360 : 0
    const start = current
    current += deg
    return {cid, start, end: current, color: colors[i%colors.length], value: val}
  })
  const gradient = (stops.length && total>0)
    ? `conic-gradient(${stops.map(s=>`${s.color} ${s.start}deg ${s.end}deg`).join(',')})`
    : 'conic-gradient(#e5e7eb 0deg 360deg)'
  return (
    <div>
      <button className="text-sm underline inline-flex items-center gap-1" onClick={()=>setOpen(!open)}>
        {open ? <ChevronDownIcon className="w-4 h-4"/> : <ChevronRightIcon className="w-4 h-4"/>}
        {open ? 'Hide categories' : 'Show expenses by category'}
      </button>
      {!open && <p className="text-xs text-gray-500 mt-1">Expand to see a category breakdown.</p>}
      {open && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="col-span-1 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border" style={{background: gradient}} title={`Total ${money(total, data.currency)}`}></div>
          </div>
          <div className="col-span-2 space-y-1">
            {entries.length === 0 && <div className="text-sm text-gray-500">No expenses yet.</div>}
            {stops.map(s => (
              <div key={s.cid} className="flex justify-between text-sm">
                <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded" style={{background:s.color}}></span>{data.categoryMap[s.cid]?.name || s.cid}</div>
                <div>{money(s.value, data.currency)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
