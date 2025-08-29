import { useEffect, useRef, useState } from 'react'
import { useMonth } from '../lib/useMonth.js'
import { Plan as PlanStore, Actuals as ActualsStore, Settings as SettingsStore, CustomCats } from '../lib/db.js'
import { ArrowUturnLeftIcon, SparklesIcon, TrashIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { leaves as taxLeaves, isAllocationByLeafId } from '../lib/taxonomy.js'
import PageHeader from '../components/PageHeader.jsx'
import CurrencyInput from '../components/CurrencyInput.jsx'

export default function Budget(){
  const { monthKey } = useMonth()
  const [cats, setCats] = useState([])
  const [plan, setPlan] = useState({})
  const [actuals, setActuals] = useState({})
  const [currency, setCurrency] = useState('EUR')
  const [saving, setSaving] = useState(false)
  const timer = useRef(null)
  const [active, setActive] = useState(()=> new URLSearchParams(location.search).get('tab') || localStorage.getItem('pf-budget-tab') || 'fixed')
  const [newName, setNewName] = useState('')
  const [newErr, setNewErr] = useState('')
  const [hideZero, setHideZero] = useState(() => {
    try {
      const NEW_KEY = 'pf-hideEmptyRows'
      const OLD_KEY = 'pf-budget-hideZero'
      const rawNew = localStorage.getItem(NEW_KEY)
      const rawOld = localStorage.getItem(OLD_KEY)
      const parsed = rawNew ? JSON.parse(rawNew) : (rawOld ? JSON.parse(rawOld) : null)
      return parsed && typeof parsed === 'object' ? { fixed:!!parsed.fixed, variable:!!parsed.variable, loans:!!parsed.loans } : { fixed:false, variable:false, loans:false }
    } catch { return { fixed:false, variable:false, loans:false } }
  })

  useEffect(() => { SettingsStore.get().then(s=>setCurrency(s.currency || 'EUR')) }, [])
  useEffect(() => {
    const load = async () => {
      const [p, a, custom] = await Promise.all([PlanStore.get(monthKey), ActualsStore.get(monthKey), CustomCats.list()])
      const all = [...taxLeaves(), ...custom]
      setPlan(p.data || {}); setActuals(a.data || {}); setCats(all)
    }
    load()
  }, [monthKey])

  // auto-save both plan and actuals
  useEffect(() => {
    if (!cats.length) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSaving(true)
      await Promise.all([
        PlanStore.set(monthKey, normalize(plan)),
        ActualsStore.set(monthKey, normalize(actuals))
      ])
      setSaving(false)
    }, 500)
    return () => timer.current && clearTimeout(timer.current)
  }, [plan, actuals])

  // Persist hideZero preference
  useEffect(() => {
    try {
      const NEW_KEY = 'pf-hideEmptyRows'
      const OLD_KEY = 'pf-budget-hideZero'
      localStorage.setItem(NEW_KEY, JSON.stringify(hideZero))
      if (localStorage.getItem(OLD_KEY)) localStorage.removeItem(OLD_KEY)
    } catch (e) { void e }
  }, [hideZero])

  const fixedCats = cats.filter(c=> c.section==='fixed')
  const loanCats = cats.filter(c=> c.section==='loans')
  const variableCats = cats.filter(c=> c.section==='variable')
  const allocationCats = cats.filter(c=> c.section==='allocations')
  const sum = (obj, list) => list.reduce((a,c)=> a + Number(obj[c.id]||0), 0)
  const plannedFixed = sum(plan, fixedCats), plannedVar = sum(plan, variableCats)
  const actualFixed = sum(actuals, fixedCats), actualVar = sum(actuals, variableCats)
  // Totals by section are displayed below; overall totals are computed on the fly

  function copyLastMonth(){
    try {
      const [y,m] = monthKey.split('-').map(Number)
      const prev = new Date(y, m-2, 1)
      const prevKey = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`
      PlanStore.get(prevKey).then(p=> {
        const lists = { fixed: fixedCats, variable: variableCats, loans: loanCats }
        const target = lists[active] || []
        const next = { ...plan }
        for (const c of target){ next[c.id] = p.data?.[c.id] || 0 }
        setPlan(next)
      })
    } catch (e) { void e }
  }

  function prefillFromPlanFor(catsList){
    const next = { ...actuals }
    for (const c of catsList) if (plan[c.id] != null) next[c.id] = plan[c.id]
    setActuals(next)
  }

  async function clearAll(){
    // Clear only rows visible under the current tab
    const lists = { fixed: fixedCats, variable: variableCats, loans: loanCats }
    const target = lists[active] || []
    const nextPlan = { ...plan }
    const nextActuals = { ...actuals }
    for (const c of target){ nextPlan[c.id] = 0; nextActuals[c.id] = 0 }
    setPlan(nextPlan); setActuals(nextActuals)
  }

  function changeTab(t){ setActive(t); localStorage.setItem('pf-budget-tab', t) }

  async function addCustom(){
    const name = newName.trim()
    if(!name){ setNewErr('Name required'); return }
    if(name.length>40){ setNewErr('Keep it under 40 characters'); return }
    setNewErr('')
    const item = await CustomCats.add(active, name)
    setCats([...cats, item]); setNewName('')
  }

  async function maybeDeleteCustom(id){
    const zero = (n)=> Number(n||0)===0
    if (zero(plan[id]) && zero(actuals[id])){
      await CustomCats.remove(id)
      setCats(cats.filter(c=>c.id!==id))
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Budget" right={saving ? 'Saving…' : 'All changes saved'} />
      <p className="text-sm text-gray-600">Set Plan and enter Actuals for the selected month. Δ is Actual − Plan (red means over plan).</p>
      <div className="flex gap-2 border-b">
        {['fixed','variable','loans','allocations'].map(t=> (
          <button key={t} className={`px-3 py-2 text-sm transition-colors ${active===t?'border-b-2 border-indigo-500 font-semibold text-indigo-700':'text-gray-600 hover:text-gray-800'}`} onClick={()=>changeTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>
        ))}
      </div>
      {active==='fixed' && (
        <Section title="Fixed" cats={fixedCats} currency={currency}
          plan={plan} setPlan={setPlan} actuals={actuals} setActuals={setActuals}
          onDeleteCustom={maybeDeleteCustom}
          hideZero={hideZero.fixed}
          onToggleHide={(v)=>setHideZero({...hideZero,fixed:v})}
        />
      )}
      {active==='variable' && (
        <Section title="Variable" cats={variableCats} currency={currency}
          plan={plan} setPlan={setPlan} actuals={actuals} setActuals={setActuals}
          onDeleteCustom={maybeDeleteCustom}
          hideZero={hideZero.variable}
          onToggleHide={(v)=>setHideZero({...hideZero,variable:v})}
        />
      )}
      {active==='loans' && (
        <Section title="Loans" cats={loanCats} currency={currency}
          plan={plan} setPlan={setPlan} actuals={actuals} setActuals={setActuals}
          onDeleteCustom={maybeDeleteCustom}
          hideZero={hideZero.loans}
          onToggleHide={(v)=>setHideZero({...hideZero,loans:v})}
        />
      )}
      {active==='allocations' && (
        <Section title="Allocations" cats={allocationCats} currency={currency}
          plan={plan} setPlan={setPlan} actuals={actuals} setActuals={setActuals}
          onDeleteCustom={maybeDeleteCustom}
          hideZero={false}
          onToggleHide={()=>{}}
          allocations
        />
      )}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {active==='fixed' && (<>
            Plan <b>{money(plannedFixed,currency)}</b> • Actual <b>{money(actualFixed,currency)}</b> • Δ <b>{money(actualFixed-plannedFixed,currency)}</b>
          </>)}
          {active==='variable' && (<>
            Plan <b>{money(plannedVar,currency)}</b> • Actual <b>{money(actualVar,currency)}</b> • Δ <b>{money(actualVar-plannedVar,currency)}</b>
          </>)}
          {active==='loans' && (<>
            Plan <b>{money(sum(plan, loanCats),currency)}</b> • Actual <b>{money(sum(actuals, loanCats),currency)}</b> • Δ <b>{money(sum(actuals, loanCats)-sum(plan, loanCats),currency)}</b>
          </>)}
          {active==='allocations' && (<>
            Planned <b>{money(sum(plan, allocationCats),currency)}</b> • Actual <b>{money(sum(actuals, allocationCats),currency)}</b> • Progress <b className={`${(sum(actuals, allocationCats) >= sum(plan, allocationCats))?'text-emerald-600':'text-red-600'}`}>{sum(actuals, allocationCats) >= sum(plan, allocationCats) ? 'On/Above plan' : 'Below plan'}</b>
          </>)}
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={copyLastMonth}><ArrowUturnLeftIcon className="w-4 h-4"/>Copy last month</button>
          {active==='fixed' && <button className="btn" onClick={()=>prefillFromPlanFor(fixedCats)}><SparklesIcon className="w-4 h-4"/>Prefill actuals</button>}
          {active==='loans' && <button className="btn" onClick={()=>prefillFromPlanFor(loanCats)}><SparklesIcon className="w-4 h-4"/>Prefill actuals</button>}
          <button className="btn" onClick={clearAll}><TrashIcon className="w-4 h-4"/>Clear all</button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input className={`border rounded px-2 py-1 ${newErr?'border-red-500':''}`} placeholder={`Add subcategory to ${active}`} value={newName} onChange={(e)=>setNewName(e.target.value)} />
        <button className="px-3 py-1 rounded border text-sm" onClick={addCustom}>Add</button>
        <span className={`text-xs ${newErr?'text-red-600':'text-gray-500'}`}>{newErr || 'Custom rows can be deleted when Plan and Actual are both 0.'}</span>
      </div>
    </div>
  )
}

function Section({ title, cats, currency, plan, setPlan, actuals, setActuals, onDeleteCustom, hideZero=false, onToggleHide, allocations=false }){
  return (
    <div className="tile tile-tight">
      <div className="flex items-center justify-between pb-1 mb-2 border-b border-indigo-100">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-4">
          <label className="text-[11px] text-gray-600 inline-flex items-center gap-1">
            <input type="checkbox" className="mr-1" checked={hideZero} onChange={(e)=>onToggleHide?.(e.target.checked)} />
            Hide empty rows
          </label>
          <span className="text-[11px] text-gray-500 inline-flex items-center gap-1"><InformationCircleIcon className="w-4 h-4"/>{infoFor(title)}</span>
        </div>
      </div>
      {/* Desktop/tablet table */}
      <div className="hidden sm:block overflow-x-auto -mx-2 sm:mx-0">
      <table className="min-w-[560px] w-full text-sm table-auto">
        <thead>
          <tr className="text-left text-gray-500 bg-gray-50 sticky top-0 z-10">
            <th className="py-1.5 px-2 rounded-l w-1/2">Subcategory</th>
            <th className="text-right py-1.5 w-1/4">Planned</th>
            <th className="text-right py-1.5 w-1/4">Actual</th>
            <th className="text-right py-1.5 rounded-r w-20 hidden sm:table-cell">Δ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {cats.length===0 && <tr><td colSpan="5" className="text-center text-gray-500 py-4">No categories</td></tr>}
          {(hideZero ? cats.filter(c=> (Number(plan[c.id]||0)>0) || (Number(actuals[c.id]||0)>0)) : cats).map(c=>{
            const p = Number(plan[c.id]||0)
            const a = Number(actuals[c.id]||0)
            const d = Number((a-p).toFixed(2))
            const isAlloc = allocations || isAllocationByLeafId(c.id)
            const near = !isAlloc && p>0 && a>=0.8*p && a<p
            const good = isAlloc ? (a>=p ? true : false) : (d<0)
            const bad = isAlloc ? (a<p ? true : false) : (d>0)
            const chip = bad? 'bg-red-100 text-red-700' : good? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
            return (
              <>
              <tr key={c.id} className={`${(!isAlloc && d>0)?'bg-red-50':(!isAlloc && near)?'bg-amber-50':'even:bg-gray-50'}`}>
                <td className="py-1.5 px-2 pr-3">{c.name}</td>
                <td className="text-right pr-3">
                  <CurrencyInput currency={currency} value={plan[c.id]} onChange={(v)=>setPlan({...plan,[c.id]:v})} ariaLabel={`Planned for ${c.name}`} title={`Planned monthly amount for ${c.name}`} />
                </td>
                <td className="text-right pl-3">
                  <CurrencyInput currency={currency} value={actuals[c.id]} onChange={(v)=>setActuals({...actuals,[c.id]:v})} ariaLabel={`Actual for ${c.name}`} title={`Actual spent for ${c.name}`} />
                </td>
                <td className="text-right hidden sm:table-cell">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${chip}`}>{isAlloc ? `${a>=p?'+':''}${money(a-p,currency)}` : money(Math.abs(d),currency)}</span>
                  {String(c.id).startsWith('custom:') && (
                    <button className="ml-2 text-xs text-red-600 inline-flex items-center gap-1" title="Delete row" onClick={()=>onDeleteCustom?.(c.id)}>
                      <XMarkIcon className="w-3.5 h-3.5"/>
                      <span>Delete</span>
                    </button>
                  )}
                </td>
              </tr>
              {/* Mobile-only delta chip under the row */}
              <tr className="sm:hidden">
                <td className="py-1 px-2 text-right text-xs text-gray-600" colSpan="3">
                  <span className={`inline-block rounded-full px-2 py-0.5 ${chip}`}>{isAlloc ? `${a>=p?'+':''}${money(a-p,currency)}` : money(Math.abs(d),currency)}</span>
                </td>
              </tr>
              </>
            )
          })}
        </tbody>
      </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-gray-100">
        {cats.length===0 && <div className="text-center text-gray-500 py-4">No categories</div>}
        {(hideZero ? cats.filter(c=> (Number(plan[c.id]||0)>0) || (Number(actuals[c.id]||0)>0)) : cats).map(c=>{
          const p = Number(plan[c.id]||0)
          const a = Number(actuals[c.id]||0)
          const d = Number((a-p).toFixed(2))
          const isAlloc = allocations || isAllocationByLeafId(c.id)
          const near = !isAlloc && p>0 && a>=0.8*p && a<p
          const good = isAlloc ? (a>=p ? true : false) : (d<0)
          const bad = isAlloc ? (a<p ? true : false) : (d>0)
          const chip = bad? 'bg-red-100 text-red-700' : good? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
          return (
            <div key={c.id} className={`py-2 ${d>0?'bg-red-50':near?'bg-amber-50':''}`}>
              <div className="flex items-start justify-between">
                <div className="font-medium pr-2">{c.name}</div>
                <div className="text-xs"><span className={`inline-block rounded-full px-2 py-0.5 ${chip}`}>{isAlloc ? `${a>=p?'+':''}${money(a-p,currency)}` : money(Math.abs(d),currency)}</span></div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[11px] text-gray-500 mb-1">Planned</div>
                  <CurrencyInput currency={currency} value={plan[c.id]} onChange={(v)=>setPlan({...plan,[c.id]:v})} ariaLabel={`Planned for ${c.name}`} title={`Planned monthly amount for ${c.name}`} />
                </div>
                <div>
                  <div className="text-[11px] text-gray-500 mb-1">Actual</div>
                  <CurrencyInput currency={currency} value={actuals[c.id]} onChange={(v)=>setActuals({...actuals,[c.id]:v})} ariaLabel={`Actual for ${c.name}`} title={`Actual spent for ${c.name}`} />
                </div>
              </div>
              {String(c.id).startsWith('custom:') && (
                <div className="mt-2 flex justify-end">
                  <button className="text-xs text-red-600 inline-flex items-center gap-1" title="Delete row" onClick={()=>onDeleteCustom?.(c.id)}>
                    <XMarkIcon className="w-3.5 h-3.5"/>
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function normalize(d){
  const res = {}
  for (const [k,v] of Object.entries(d)){
    const n = Number(v)
    if (isFinite(n) && n>0) res[k] = Number(n.toFixed(2))
  }
  return res
}

function money(v,currency='EUR'){ const n=Number(v||0); return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(n) }

function infoFor(title){
  if (title==='Fixed') return 'Predictable monthly bills (rent, utilities, insurance)'
  if (title==='Variable') return 'Day‑to‑day flexible costs (groceries, dining, transport)'
  if (title==='Loans') return 'Loan repayments (car, personal, other)'
  return ''
}
