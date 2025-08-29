import { Income, Plan, Settings, Actuals, CustomCats, IncomeTotals } from './db.js'
import { leaves as taxLeaves, isVariableByLeafId, isAllocationByLeafId, allocationAffectsCash } from './taxonomy.js'

export async function computeMonth(monthKey) {
  const [incomes, incomeTotals, actualsObj, planObj, settings, customCats] = await Promise.all([
    Income.byMonth(monthKey),
    IncomeTotals.get(monthKey),
    Actuals.get(monthKey),
    Plan.get(monthKey),
    Settings.get(),
    CustomCats.list()
  ])

  // Build category map early for section lookups
  const categoryMap = Object.fromEntries(
    [...taxLeaves(), ...customCats.map(c=>({ ...c, parentName: c.section, section: c.section }))]
      .map((c) => [c.id, c])
  )

  let incomeTotal = 0
  const totalsData = incomeTotals?.data || {}
  if (Object.keys(totalsData).length) {
    incomeTotal = sum(Object.values(totalsData).map((v)=> Number(v?.amount || v || 0)))
  } else {
    incomeTotal = sum(incomes.map((i) => i.amount))
  }
  const actuals = actualsObj.data || {}
  const getSection = (id) => {
    const c = categoryMap[id]
    if (c && c.section) return c.section
    return isVariableByLeafId(id) ? 'variable' : 'fixed'
  }
  let expenseFixed = 0, expenseVariable = 0, expenseLoans = 0
  let allocationsActual = 0, allocationsCashOut = 0
  for (const [id, v] of Object.entries(actuals)) {
    const n = Number(v) || 0
    const sec = getSection(id)
    if (sec === 'variable') expenseVariable += n
    else if (sec === 'loans') expenseLoans += n
    else if (sec === 'allocations') { allocationsActual += n; if (allocationAffectsCash(id)) allocationsCashOut += n }
    else expenseFixed += n
  }
  const expenseTotal = round2(expenseFixed + expenseVariable + expenseLoans)
  const netCash = round2(incomeTotal - expenseTotal - allocationsCashOut)
  let plannedFixed = 0, plannedVariable = 0, plannedLoans = 0, plannedAllocations = 0, plannedAllocationsCashOut = 0
  for (const [id, v] of Object.entries(planObj.data||{})){
    const n = Number(v)||0
    const sec = getSection(id)
    if (sec==='variable') plannedVariable += n
    else if (sec==='loans') plannedLoans += n
    else if (sec==='allocations') { plannedAllocations += n; if (allocationAffectsCash(id)) plannedAllocationsCashOut += n }
    else plannedFixed += n
  }
  const plannedTotal = round2(plannedFixed + plannedVariable + plannedLoans)
  const rawOverspend = expenseTotal - plannedTotal
  const rawOverspendFixed = expenseFixed - plannedFixed
  const rawOverspendVariable = expenseVariable - plannedVariable
  const rawOverspendLoans = expenseLoans - plannedLoans

  const overspend = round2(Math.max(0, rawOverspend))
  const overspendFixed = round2(Math.max(0, rawOverspendFixed))
  const overspendVariable = round2(Math.max(0, rawOverspendVariable))
  const overspendLoans = round2(Math.max(0, rawOverspendLoans))

  const underspend = round2(Math.max(0, plannedTotal - expenseTotal))
  const underspendFixed = round2(Math.max(0, plannedFixed - expenseFixed))
  const underspendVariable = round2(Math.max(0, plannedVariable - expenseVariable))
  const underspendLoans = round2(Math.max(0, plannedLoans - expenseLoans))

  // Signed deltas (Actual minus Plan). Positive = overspend, Negative = under plan.
  const deltaTotal = round2(expenseTotal - plannedTotal)
  const deltaFixed = round2(expenseFixed - plannedFixed)
  const deltaVariable = round2(expenseVariable - plannedVariable)
  const deltaLoans = round2(expenseLoans - plannedLoans)
  const allocationsDelta = round2(allocationsActual - plannedAllocations)
  const savingsNow = Number(settings.currentSavings || 0)
  const savingsMin = Number(settings.minSavings || 0)
  const savingsAfterCash = round2(savingsNow + netCash)
  const savingsOk = savingsAfterCash >= savingsMin

  // Breakdown by category for dashboard convenience
  const byCategoryId = { ...actuals }
  const spendByCategoryId = Object.fromEntries(Object.entries(actuals).filter(([id])=>!isAllocationByLeafId(id)))
  
  return {
    monthKey,
    incomeTotal,
    expenseTotal, // consumption only (excludes allocations)
    expenseFixed,
    expenseVariable,
    expenseLoans,
    netCash,
    plannedTotal, // consumption only
    plannedFixed,
    plannedVariable,
    plannedLoans,
    plannedAllocations,
    plannedAllocationsCashOut,
    allocationsActual,
    allocationsCashOut,
    overspend,
    overspendFixed,
    overspendVariable,
    overspendLoans,
    underspend,
    underspendFixed,
    underspendVariable,
    underspendLoans,
    deltaTotal,
    deltaFixed,
    deltaVariable,
    deltaLoans,
    allocationsDelta,
    savingsAfterCash,
    savingsOk,
    savingsMin,
    savingsNow,
    currency: settings.currency || 'USD',
    byCategoryId,
    spendByCategoryId,
    categoryMap
  }
}

function sum(arr) { return round2(arr.reduce((a, b) => a + (Number(b) || 0), 0)) }
function round2(n) { return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2)) }
