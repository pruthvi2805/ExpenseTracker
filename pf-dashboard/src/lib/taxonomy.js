// Static expense taxonomy grouped into sections via group metadata.
export const groups = [
  // Fixed
  { id: 'housing', name: 'Housing', variable: false, children: [
    { id: 'housing:mortgage_rent', name: 'Mortgage/Rent' },
  ]},
  { id: 'utilities', name: 'Utilities', variable: false, children: [
    { id: 'utilities:energy', name: 'Electricity/Gas' },
    { id: 'utilities:water', name: 'Water' },
    { id: 'utilities:internet', name: 'Internet' },
    { id: 'utilities:mobile', name: 'Mobile' },
  ]},
  { id: 'insurance', name: 'Insurance', variable: false, children: [
    { id: 'insurance:health', name: 'Health insurance' },
    { id: 'insurance:car', name: 'Car insurance' },
    { id: 'insurance:home', name: 'Home insurance' },
    { id: 'insurance:life', name: 'Life insurance' },
    { id: 'insurance:liability', name: 'Liability insurance' },
  ]},
  { id: 'subscriptions', name: 'Subscriptions', variable: false, children: [
    { id: 'subscriptions:streaming', name: 'Streaming' },
    { id: 'subscriptions:cloud', name: 'Cloud storage' },
    { id: 'subscriptions:security', name: 'Home security' },
  ]},
  { id: 'bank', name: 'Banking', variable: false, children: [
    { id: 'bank:fees', name: 'Banking fees' },
  ]},
  { id: 'devices', name: 'Devices', variable: false, children: [
    { id: 'devices:payments', name: 'Device payments' },
  ]},

  // Variable
  { id: 'living', name: 'Living Expenses', variable: true, children: [
    { id: 'living:groceries', name: 'Groceries' },
    { id: 'living:transport', name: 'Transport' },
    { id: 'living:dining', name: 'Dining out' },
    { id: 'living:health_personal', name: 'Health & personal' },
    { id: 'living:entertainment', name: 'Entertainment & shopping' },
  ]},
  { id: 'special', name: 'Special', variable: true, children: [
    { id: 'special:unexpected', name: 'Yearly/Unexpected fund' },
    { id: 'special:investments', name: 'Investments & savings' },
  ]},

  // Loans (their own section, treated as fixed in math)
  { id: 'loans', name: 'Loans', variable: false, children: [
    { id: 'loans:car', name: 'Car loan/lease' },
    { id: 'loans:personal', name: 'Personal loan' },
    { id: 'loans:other', name: 'Other loan' },
  ]},
]

export function leaves() {
  const out = []
  for (const g of groups) {
    const section = g.id === 'loans' ? 'loans' : (g.variable ? 'variable' : 'fixed')
    for (const c of g.children) out.push({ ...c, parentId: g.id, parentName: g.name, variable: !!g.variable, section })
  }
  return out
}

export function labelFor(leaf) {
  return `${leaf.parentName ?? groupById(leaf.parentId)?.name ?? ''} — ${leaf.name}`.trim()
}

export function groupById(id) {
  return groups.find((g) => g.id === id)
}

export function leafById(id) {
  return leaves().find((l) => l.id === id)
}

export function isVariableByLeafId(id){
  const l = leafById(id)
  return !!(l && l.variable)
}
