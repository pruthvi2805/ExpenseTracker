import { useEffect, useRef, useState } from 'react'
import { useMonth } from '../lib/useMonth.js'
import { Plan as PlanStore, Actuals as ActualsStore, Settings as SettingsStore, CustomCats } from '../lib/db.js'
import { ArrowUturnLeftIcon, SparklesIcon, TrashIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { leaves as taxLeaves, isAllocationByLeafId } from '../lib/taxonomy.js'
import PageHeader from '../components/PageHeader.jsx'
import { showToast } from '../lib/toast.js'
import CurrencyInput from '../components/CurrencyInput.jsx'
import Decimal from 'decimal.js'
import { money, computeDaysLeft, sumNumbers } from '../lib/utils.js'
import { LOCAL_STORAGE_KEYS, CATEGORY_SECTIONS, NUMERIC_CONSTANTS } from '../lib/constants.js'
import { sum } from '../lib/calc.js' // The Decimal-aware sum function

export default function Budget(){
  const { monthKey } = useMonth()
  const [cats, setCats] = useState([])
  const [plan, setPlan] = useState({})
  const [actuals, setActuals] = useState({})
  const [currency, setCurrency] = useState('EUR')
  const [saving, setSaving] = useState(false)
  const timer = useRef(null)
  const [active, setActive] = useState(()=> new URLSearchParams(location.search).get('tab') || localStorage.getItem(LOCAL_STORAGE_KEYS.BUDGET_TAB) || CATEGORY_SECTIONS.FIXED)
  const [newName, setNewName] = useState('')
  const [newErr, setNewErr] = useState('')
  const [hideZero, setHideZero] = useState(() => {
    try {
      const NEW_KEY = LOCAL_STORAGE_KEYS.HIDE_EMPTY_ROWS
      const OLD_KEY = LOCAL_STORAGE_KEYS.LEGACY_HIDE_ZERO
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
    }, NUMERIC_CONSTANTS.SAVE_DEBOUNCE_MS)
    return () => timer.current && clearTimeout(timer.current)
  }, [plan, actuals, cats.length, monthKey])

  // Persist hideZero preference
  useEffect(() => {
    try {
      const NEW_KEY = LOCAL_STORAGE_KEYS.HIDE_EMPTY_ROWS
      const OLD_KEY = LOCAL_STORAGE_KEYS.LEGACY_HIDE_ZERO
      localStorage.setItem(NEW_KEY, JSON.stringify(hideZero))
      if (localStorage.getItem(OLD_KEY)) localStorage.removeItem(OLD_KEY)
    } catch (e) { void e }
  }, [hideZero])

  const fixedCats = cats.filter(c=> c.section===CATEGORY_SECTIONS.FIXED)
  const loanCats = cats.filter(c=> c.section===CATEGORY_SECTIONS.LOANS)
  const variableCats = cats.filter(c=> c.section===CATEGORY_SECTIONS.VARIABLE)
  const allocationCats = cats.filter(c=> c.section===CATEGORY_SECTIONS.ALLOCATIONS)
  const plannedFixed = sum(plan, fixedCats).toNumber(), plannedVar = sum(plan, variableCats).toNumber()
  const actualFixed = sum(actuals, fixedCats).toNumber(), actualVar = sum(actuals, variableCats).toNumber()
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
    const snapshot = {
      plan: Object.fromEntries(target.map(c=>[c.id, plan[c.id]||0])),
      actuals: Object.fromEntries(target.map(c=>[c.id, actuals[c.id]||0]))
    }
    for (const c of target){ nextPlan[c.id] = 0; nextActuals[c.id] = 0 }
    setPlan(nextPlan); setActuals(nextActuals)
    showToast({ message: 'Cleared rows', actionLabel: 'Undo', onAction: ()=>{
      const restoredPlan = { ...nextPlan }
      const restoredActuals = { ...nextActuals }
      for (const [k,v] of Object.entries(snapshot.plan)) restoredPlan[k] = v
      for (const [k,v] of Object.entries(snapshot.actuals)) restoredActuals[k] = v
      setPlan(restoredPlan); setActuals(restoredActuals)
    }})
  }

  function changeTab(t){ setActive(t); localStorage.setItem(LOCAL_STORAGE_KEYS.BUDGET_TAB, t) }

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
      const toRemove = cats.find(c=>c.id===id)
      await CustomCats.remove(id)
      setCats(cats.filter(c=>c.id!==id))
      showToast({ message: `Deleted "${toRemove?.name||'Custom'}"`, actionLabel: 'Undo', onAction: async()=>{
        // Re-add with same name under current active section
        const item = await CustomCats.add(active, toRemove?.name || 'Custom')
        setCats([...cats.filter(c=>c.id!==id), item])
      } })
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Budget" right={saving ? 'Saving…' : 'All changes saved'} />
      <p className="text-sm text-gray-600">Set Plan and enter Actuals for the selected month. For expenses, Δ = Actual − Plan (red = overspend). In <b>Allocations</b>, higher Actual is better (meeting/exceeding your savings and investment plan).</p>
      <div className="flex gap-2 border-b">
        {['fixed','variable','loans','allocations'].map(t=> (
          <button key={t} className={`px-3 py-2 text-sm transition-colors ${active===t?'border-b-2 border-indigo-500 font-semibold text-indigo-700':'text-gray-600 hover:text-gray-800'}`} onClick={()=>changeTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>
        ))}
      </div>
      {active==='fixed' && (
        <Section title="Fixed" monthKey={monthKey} cats={fixedCats} currency={currency}
          plan={plan} setPlan={setPlan} actuals={actuals} setActuals={setActuals}
          onDeleteCustom={maybeDeleteCustom}
          hideZero={hideZero.fixed}
          onToggleHide={(v)=>setHideZero({...hideZero,fixed:v})}
        />
      )}
      {active==='variable' && (
        <Section title="Variable" monthKey={monthKey} cats={variableCats} currency={currency}
          plan={plan} setPlan={setPlan} actuals={actuals} setActuals={setActuals}
          onDeleteCustom={maybeDeleteCustom}
          hideZero={hideZero.variable}
          onToggleHide={(v)=>setHideZero({...hideZero,variable:v})}
        />
      )}
      {active==='loans' && (
        <Section title="Loans" monthKey={monthKey} cats={loanCats} currency={currency}
          plan={plan} setPlan={setPlan} actuals={actuals} setActuals={setActuals}
          onDeleteCustom={maybeDeleteCustom}
          hideZero={hideZero.loans}
          onToggleHide={(v)=>setHideZero({...hideZero,loans:v})}
        />
      )}
      {active==='allocations' && (
        <Section title="Allocations" monthKey={monthKey} cats={allocationCats} currency={currency}
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
            Plan <b>{money(plannedFixed,currency)}</b> • Actual <b>{money(actualFixed,currency)}</b> • Δ <b>{money(new Decimal(actualFixed).minus(plannedFixed),currency)}</b>
          </>)}
          {active==='variable' && (<>
            Plan <b>{money(plannedVar,currency)}</b> • Actual <b>{money(actualVar,currency)}</b> • Δ <b>{money(new Decimal(actualVar).minus(plannedVar),currency)}</b>
          </>)}
          {active==='loans' && (<>
            Plan <b>{money(sum(plan, loanCats),currency)}</b> • Actual <b>{money(sum(actuals, loanCats),currency)}</b> • Δ <b>{money(sum(actuals, loanCats).minus(sum(plan, loanCats)),currency)}</b>
          </>)}
          {active==='allocations' && (<>
            Planned <b>{money(sum(plan, allocationCats),currency)}</b> • Actual <b>{money(sum(actuals, allocationCats),currency)}</b> • Progress <b className={`${(sum(actuals, allocationCats).greaterThanOrEqualTo(sum(plan, allocationCats)))?'text-emerald-600':'text-red-600'}`}>{sum(actuals, allocationCats).greaterThanOrEqualTo(sum(plan, allocationCats)) ? 'On/Above plan' : 'Below plan'}</b>
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

function Section({ title, monthKey, cats, currency, plan, setPlan, actuals, setActuals, onDeleteCustom, hideZero=false, onToggleHide, allocations=false }){
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
      <SectionTotalsBar monthKey={monthKey} cats={cats} currency={currency} plan={plan} actuals={actuals} allocations={allocations} />
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
          {(hideZero ? cats.filter(c=> (new Decimal(plan[c.id]||0).greaterThan(0)) || (new Decimal(actuals[c.id]||0).greaterThan(0))) : cats).map(c=>{
            const p = new Decimal(plan[c.id]||0)
            const a = new Decimal(actuals[c.id]||0)
            const d = a.minus(p)
            const isAlloc = allocations || isAllocationByLeafId(c.id)
            const near = !isAlloc && p.greaterThan(0) && a.greaterThanOrEqualTo(p.times(0.8)) && a.lessThan(p)
            const good = isAlloc ? (a.greaterThanOrEqualTo(p) ? true : false) : (d.lessThan(0))
            const bad = isAlloc ? (a.lessThan(p) ? true : false) : (d.greaterThan(0))
            const chip = bad? 'bg-red-100 text-red-700' : good? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
            return (
              <>
              <tr key={c.id} className={`${(!isAlloc && d.greaterThan(0))?'bg-red-50':(!isAlloc && near)?'bg-amber-50':'even:bg-gray-50'}`}>
                <td className="py-1.5 px-2 pr-3">{c.name}</td>
                <td className="text-right pr-3">
                  <CurrencyInput currency={currency} value={plan[c.id]} onChange={(v)=>setPlan({...plan,[c.id]:v})} ariaLabel={`Planned for ${c.name}`} title={`Planned monthly amount for ${c.name}`} />
                </td>
                <td className="text-right pl-3">
                  <CurrencyInput currency={currency} value={actuals[c.id]} onChange={(v)=>setActuals({...actuals,[c.id]:v})} ariaLabel={`Actual for ${c.name}`} title={`Actual spent for ${c.name}`} />
                </td>
                <td className="text-right hidden sm:table-cell">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${chip}`}>{isAlloc ? `${a.greaterThanOrEqualTo(p)?'+':''}${money(a.minus(p),currency)}` : money(d.abs(),currency)}</span>
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
                  <span className={`inline-block rounded-full px-2 py-0.5 ${chip}`}>{isAlloc ? `${a.greaterThanOrEqualTo(p)?'+':''}${money(a.minus(p),currency)}` : money(d.abs(),currency)}</span>
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
          {(hideZero ? cats.filter(c=> (new Decimal(plan[c.id]||0).greaterThan(0)) || (new Decimal(actuals[c.id]||0).greaterThan(0))) : cats).map(c=>{
          const p = new Decimal(plan[c.id]||0)
          const a = new Decimal(actuals[c.id]||0)
          const d = a.minus(p)
          const isAlloc = allocations || isAllocationByLeafId(c.id)
          const near = !isAlloc && p.greaterThan(0) && a.greaterThanOrEqualTo(p.times(0.8)) && a.lessThan(p)
          const good = isAlloc ? (a.greaterThanOrEqualTo(p) ? true : false) : (d.lessThan(0))
          const bad = isAlloc ? (a.lessThan(p) ? true : false) : (d.greaterThan(0))
          const chip = bad? 'bg-red-100 text-red-700' : good? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
          return (
            <div key={c.id} className={`py-2 ${(!isAlloc && d.greaterThan(0))?'bg-red-50':(!isAlloc && near)?'bg-amber-50':''}`}>
              <div className="flex items-start justify-between">
                <div className="font-medium pr-2">{c.name}</div>
                <div className="text-xs"><span className={`inline-block rounded-full px-2 py-0.5 ${chip}`}>{isAlloc ? `${a.greaterThanOrEqualTo(p)?'+':''}${money(a.minus(p),currency)}` : money(d.abs(),currency)}</span></div>
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
    const n = new Decimal(v)
    if (n.isFinite() && n.greaterThan(0)) res[k] = n.toDecimalPlaces(2).toNumber()
  }
  return res
}

function infoFor(title){
  if (title===CATEGORY_SECTIONS.FIXED) return 'Predictable monthly bills (rent, utilities, insurance)'
  if (title===CATEGORY_SECTIONS.VARIABLE) return 'Day‑to‑day flexible costs (groceries, dining, transport)'
  if (title===CATEGORY_SECTIONS.LOANS) return 'Loan repayments (car, personal, other)'
  if (title===CATEGORY_SECTIONS.ALLOCATIONS) return 'Savings transfer (cash→cash) and investment contribution (cash→investments). Not counted as spend.'
  return ''
}

function SectionTotalsBar({ monthKey, cats, currency, plan, actuals, allocations=false }){
  const p = sum(plan, cats)
  const a = sum(actuals, cats)
  const remaining = p.minus(a)
  const daysLeft = computeDaysLeft(monthKey)
  const perDay = remaining.greaterThan(0) ? remaining.dividedBy(Decimal.max(new Decimal(1), new Decimal(daysLeft))) : new Decimal(0)
  const cls = (!allocations ? (remaining.greaterThanOrEqualTo(0) ? 'text-gray-700' : 'text-red-600') : (remaining.lessThanOrEqualTo(0) ? 'text-emerald-600' : 'text-gray-700'))
  const label = !allocations ? (remaining.greaterThanOrEqualTo(0) ? 'Remaining' : 'Overspent') : (remaining.lessThanOrEqualTo(0) ? 'Plan met' : 'To allocate')
  const tip = !allocations
    ? 'Remaining = Plan − Actual. If negative, you are overspent.'
    : 'To allocate = Plan − Actual. Plan met when Actual ≥ Plan.'
  const tipPerDay = !allocations
    ? 'Left per day = Remaining ÷ days left this month.'
    : 'Per day to hit plan = To allocate ÷ days left this month.'
  return (
    <div className="mb-2 -mx-2 sm:mx-0">
      <div className="rounded bg-indigo-50 border border-indigo-100 px-2 py-1.5 text-xs flex flex-wrap items-center gap-3">
        <span>Plan <b>{money(p)}</b></span>
        <span>•</span>
        <span>Actual <b>{money(a)}</b></span>
        <span>•</span>
        <span className={cls}>
          {label}
          <InformationCircleIcon className="inline w-3.5 h-3.5 mx-1 align-[-2px] text-gray-500" title={tip} aria-label={tip} />
          <b>{money(remaining.abs())}</b>
        </span>
        {(!allocations && remaining.greaterThan(0)) && (
          <span className="text-gray-600">• Left per day
            <InformationCircleIcon className="inline w-3.5 h-3.5 mx-1 align-[-2px] text-gray-500" title={tipPerDay} aria-label={tipPerDay} />
            <b>{money(perDay)}</b> ({daysLeft} days)
          </span>
        )}
        {(allocations && remaining.greaterThan(0)) && (
          <span className="text-gray-600">• Per day to hit plan
            <InformationCircleIcon className="inline w-3.5 h-3.5 mx-1 align-[-2px] text-gray-500" title={tipPerDay} aria-label={tipPerDay} />
            <b>{money(perDay)}</b> ({daysLeft} days)
          </span>
        )}
      </div>
    </div>
  )
}
