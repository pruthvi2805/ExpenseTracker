import { Plan, Actuals } from './db.js'

// One-time migrations. Idempotent.
export async function runMigrations() {
  try {
    const flagKey = 'meta:migrated:v1-allocations'
    const done = await localStorage.getItem(flagKey)
    if (done) return
    await migrateInvestmentsId()
    localStorage.setItem(flagKey, '1')
  } catch (e) {
    // Non-fatal; keep app usable even if migration fails
    console.warn('Migration failed', e)
  }
}

async function migrateInvestmentsId(){
  const from = 'special:investments'
  const to = 'allocations:investment'
  // Plans
  const plans = await Plan.allMonths()
  for (const p of plans){
    if (p?.data && Object.prototype.hasOwnProperty.call(p.data, from)){
      const { [from]: val, ...rest } = p.data
      await Plan.set(p.monthKey, { ...rest, [to]: val })
    }
  }
  // Actuals
  const actuals = await Actuals.allMonths()
  for (const a of actuals){
    if (a?.data && Object.prototype.hasOwnProperty.call(a.data, from)){
      const { [from]: val, ...rest } = a.data
      await Actuals.set(a.monthKey, { ...rest, [to]: val })
    }
  }
}

