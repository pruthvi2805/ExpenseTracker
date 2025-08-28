import { useEffect, useState } from 'react'
import { useMonth } from '../lib/monthContext.jsx'
import { computeMonth } from '../lib/calc.js'

export default function Summary(){
  const { monthKey } = useMonth()
  const [data, setData] = useState(null)
  useEffect(()=>{ computeMonth(monthKey).then(setData) },[monthKey])
  if(!data) return <div className="text-sm text-gray-500">Loading…</div>
  const top = Object.entries(data.byCategoryId).sort((a,b)=>b[1]-a[1]).slice(0,5)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile label="Income" v={money(data.incomeTotal, data.currency)} />
        <Tile label="Actual Spend" v={money(data.expenseTotal, data.currency)} />
        <Tile label="Planned Spend" v={money(data.plannedTotal, data.currency)} />
        <Tile label="Net" v={money(data.net, data.currency)} cls={data.net>=0?'text-emerald-600':'text-red-600'} />
      </div>
      <div className="bg-white rounded border p-4">
        <h2 className="font-semibold mb-2">Highlights</h2>
        {data.overspend>0 ? (
          <p className="text-sm text-red-600">Overspent by {money(data.overspend, data.currency)} (Fixed {money(data.overspendFixed, data.currency)}, Variable {money(data.overspendVariable, data.currency)})</p>
        ): (
          <p className="text-sm text-emerald-600">Under plan by {money(data.underspend, data.currency)}</p>
        )}
      </div>
      <div className="bg-white rounded border p-4">
        <h2 className="font-semibold mb-2">Top 5 Categories</h2>
        <div className="space-y-1">
          {top.map(([cid,amt]) => (
            <div key={cid} className="flex justify-between text-sm">
              <div>{data.categoryMap[cid]?.name || cid}</div>
              <div>{money(amt, data.currency)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs text-gray-500">Tip: Use browser print to save as PDF.</div>
    </div>
  )
}

function Tile({label,v,cls}){ return (
  <div className="bg-white rounded border p-4">
    <div className="text-xs text-gray-500">{label}</div>
    <div className={`text-2xl font-semibold ${cls||''}`}>{v}</div>
  </div>
)}

function money(v,currency='EUR'){ const n=Number(v||0); return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(n) }

