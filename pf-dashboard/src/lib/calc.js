import { Income, Plan, Settings, Actuals, CustomCats, IncomeTotals } from './db.js'
import { leaves as taxLeaves, isVariableByLeafId, isAllocationByLeafId, allocationAffectsCash } from './taxonomy.js'
import { Decimal } from 'decimal.js'

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

  let incomeTotal = new Decimal(0)
  const totalsData = incomeTotals?.data || {}
  if (Object.keys(totalsData).length) {
    incomeTotal = sum(Object.values(totalsData).map((v) => new Decimal(v?.amount || v || 0)))
  } else {
    incomeTotal = sum(incomes.map((i) => new Decimal(i.amount)))
  }
  const actuals = actualsObj.data || {}
  const getSection = (id) => {
    const c = categoryMap[id]
    if (c && c.section) return c.section
    return isVariableByLeafId(id) ? 'variable' : 'fixed'
  }
  let expenseFixed = new Decimal(0), expenseVariable = new Decimal(0), expenseLoans = new Decimal(0)
  let allocationsActual = new Decimal(0), allocationsCashOut = new Decimal(0)
  for (const [id, v] of Object.entries(actuals)) {
    const n = new Decimal(v || 0)
    const sec = getSection(id)
    if (sec === 'variable') expenseVariable = expenseVariable.plus(n)
    else if (sec === 'loans') expenseLoans = expenseLoans.plus(n)
    else if (sec === 'allocations') { allocationsActual = allocationsActual.plus(n); if (allocationAffectsCash(id)) allocationsCashOut = allocationsCashOut.plus(n) }
    else expenseFixed = expenseFixed.plus(n)
  }
  const expenseTotal = expenseFixed.plus(expenseVariable).plus(expenseLoans)
  const netCash = incomeTotal.minus(expenseTotal).minus(allocationsCashOut)
  let plannedFixed = new Decimal(0), plannedVariable = new Decimal(0), plannedLoans = new Decimal(0), plannedAllocations = new Decimal(0), plannedAllocationsCashOut = new Decimal(0)
  for (const [id, v] of Object.entries(planObj.data||{})){
    const n = new Decimal(v||0)
    const sec = getSection(id)
    if (sec==='variable') plannedVariable = plannedVariable.plus(n)
    else if (sec==='loans') plannedLoans = plannedLoans.plus(n)
    else if (sec==='allocations') { plannedAllocations = plannedAllocations.plus(n); if (allocationAffectsCash(id)) plannedAllocationsCashOut = plannedAllocationsCashOut.plus(n) }
    else plannedFixed = plannedFixed.plus(n)
  }
  const plannedTotal = plannedFixed.plus(plannedVariable).plus(plannedLoans)
  const rawOverspend = expenseTotal.minus(plannedTotal)
  const rawOverspendFixed = expenseFixed.minus(plannedFixed)
  const rawOverspendVariable = expenseVariable.minus(plannedVariable)
  const rawOverspendLoans = expenseLoans.minus(plannedLoans)

  const overspend = Decimal.max(0, rawOverspend)
  const overspendFixed = Decimal.max(0, rawOverspendFixed)
  const overspendVariable = Decimal.max(0, rawOverspendVariable)
  const overspendLoans = Decimal.max(0, rawOverspendLoans)

  const underspend = Decimal.max(0, plannedTotal.minus(expenseTotal))
  const underspendFixed = Decimal.max(0, plannedFixed.minus(expenseFixed))
  const underspendVariable = Decimal.max(0, plannedVariable.minus(expenseVariable))
  const underspendLoans = Decimal.max(0, plannedLoans.minus(expenseLoans))

  // Signed deltas (Actual minus Plan). Positive = overspend, Negative = under plan.
  const deltaTotal = expenseTotal.minus(plannedTotal)
  const deltaFixed = expenseFixed.minus(plannedFixed)
  const deltaVariable = expenseVariable.minus(plannedVariable)
  const deltaLoans = expenseLoans.minus(plannedLoans)
  const allocationsDelta = allocationsActual.minus(plannedAllocations)
  const savingsNow = new Decimal(settings.currentSavings || 0)
  const savingsMin = new Decimal(settings.minSavings || 0)
  const savingsAfterCash = savingsNow.plus(netCash)
  const savingsOk = savingsAfterCash.greaterThanOrEqualTo(savingsMin)

  // Breakdown by category for dashboard convenience
  const byCategoryId = { ...actuals }
  const spendByCategoryId = Object.fromEntries(Object.entries(actuals).filter(([id])=>!isAllocationByLeafId(id)).map(([k,v]) => [k, new Decimal(v||0).toDecimalPlaces(2).toNumber()]))
  
  return {
    monthKey,
    incomeTotal: incomeTotal.toNumber(),
    expenseTotal: expenseTotal.toNumber(), // consumption only (excludes allocations)
    expenseFixed: expenseFixed.toNumber(),
    expenseVariable: expenseVariable.toNumber(),
    expenseLoans: expenseLoans.toNumber(),
    netCash: netCash.toNumber(),
    plannedTotal: plannedTotal.toNumber(), // consumption only
    plannedFixed: plannedFixed.toNumber(),
    plannedVariable: plannedVariable.toNumber(),
    plannedLoans: plannedLoans.toNumber(),
    plannedAllocations: plannedAllocations.toNumber(),
    plannedAllocationsCashOut: plannedAllocationsCashOut.toNumber(),
    allocationsActual: allocationsActual.toNumber(),
    allocationsCashOut: allocationsCashOut.toNumber(),
    overspend: overspend.toNumber(),
    overspendFixed: overspendFixed.toNumber(),
    overspendVariable: overspendVariable.toNumber(),
    overspendLoans: overspendLoans.toNumber(),
    underspend: underspend.toNumber(),
    underspendFixed: underspendFixed.toNumber(),
    underspendVariable: underspendVariable.toNumber(),
    underspendLoans: underspendLoans.toNumber(),
    deltaTotal: deltaTotal.toNumber(),
    deltaFixed: deltaFixed.toNumber(),
    deltaVariable: deltaVariable.toNumber(),
    deltaLoans: deltaLoans.toNumber(),
    allocationsDelta: allocationsDelta.toNumber(),
    savingsAfterCash: savingsAfterCash.toNumber(),
    savingsOk,
    savingsMin: savingsMin.toNumber(),
    savingsNow: savingsNow.toNumber(),
    currency: settings.currency || 'USD',
    byCategoryId: Object.fromEntries(Object.entries(actuals).map(([k,v]) => [k, new Decimal(v||0).toDecimalPlaces(2).toNumber()])),
    spendByCategoryId: Object.fromEntries(Object.entries(actuals).filter(([id])=>!isAllocationByLeafId(id)).map(([k,v]) => [k, new Decimal(v||0).toDecimalPlaces(2).toNumber()])),
    categoryMap
  }
}

function sum(arr) { return arr.reduce((a, b) => a.plus(new Decimal(b || 0)), new Decimal(0)) }
function round2(n) { return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2)) }
