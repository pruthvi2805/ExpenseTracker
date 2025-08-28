import { useEffect, useState } from 'react'
import { Category } from '../lib/db.js'

export default function Categories() {
  const [cats, setCats] = useState([])
  const [groupForm, setGroupForm] = useState({ name: '', type: 'expense' })
  const [subForm, setSubForm] = useState({ parentId: '', name: '', type: 'expense' })
  const [error, setError] = useState('')

  const load = async () => setCats(await Category.all())
  useEffect(() => { load() }, [])

  async function addGroup(e) {
    e.preventDefault(); setError('')
    try { await Category.create({ ...groupForm, parentId: null }); setGroupForm({ name: '', type: 'expense' }); await load() }
    catch (err) { setError(err.message) }
  }

  async function addSub(e) {
    e.preventDefault(); setError('')
    try {
      if (!subForm.parentId) throw new Error('Choose a category group')
      await Category.create({ ...subForm })
      setSubForm({ parentId: '', name: '', type: 'expense' }); await load()
    } catch (err) { setError(err.message) }
  }

  async function remove(id) {
    setError('')
    try { await Category.remove(id); await load() } catch (err) { setError(err.message) }
  }

  async function update(id, patch) { await Category.update(id, patch); await load() }

  async function seedDefaults(){
    setError('')
    const structure = [
      { name: 'Housing', children: ['Mortgage / Rent','Housing association / HOA fees'] },
      { name: 'Insurance', children: ['Health insurance','Car insurance','Liability / Legal insurance','Home contents insurance','Life insurance'] },
      { name: 'Utilities', children: ['Energy','Water','Internet','Mobile phone'] },
      { name: 'Subscriptions', children: ['Appliance / equipment rental','Streaming & digital services','Smart home/security subscriptions'] },
      { name: 'Taxes & Government Fees', children: ['Municipal / property tax','Road / vehicle tax','Local authority charges'] },
      { name: 'Loans & Debt', children: ['Personal loans','Car loans / leases','Credit card repayments'] },
      { name: 'Banking Fees', children: ['Account fees','Credit card annual/monthly fees'] },
      { name: 'Living Expenses', children: ['Groceries','Dining out & delivery','Transport','Entertainment & shopping','Health & personal care'] },
      { name: 'Special Allocations', children: ['Unexpected / yearly fund','Investments / savings'] },
    ]
    for (const g of structure){
      const group = await Category.create({ name: g.name, type: 'expense', parentId: null })
      for (const ch of g.children){
        await Category.create({ name: ch, type: 'expense', parentId: group.id })
      }
    }
    await load()
  }

  const groups = cats.filter(c=>!c.parentId)
  const byParent = groups.reduce((m,g)=>{m[g.id]=cats.filter(c=>c.parentId===g.id);return m}, {})

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold mb-3">Category Groups & Subcategories</h2>
          <button type="button" className="text-sm underline" onClick={seedDefaults}>Seed default categories</button>
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form onSubmit={addGroup} className="flex gap-2 flex-wrap">
            <input placeholder="New group name" className="border rounded px-2 py-1" value={groupForm.name} onChange={(e)=>setGroupForm({...groupForm,name:e.target.value})} required />
            <button className="px-3 py-1 rounded bg-gray-900 text-white text-sm">Add Group</button>
          </form>
          <form onSubmit={addSub} className="flex gap-2 flex-wrap">
            <select className="border rounded px-2 py-1" value={subForm.parentId} onChange={(e)=>setSubForm({...subForm,parentId:e.target.value})} required>
              <option value="">Choose group</option>
              {groups.map(g=> <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input placeholder="New subcategory" className="border rounded px-2 py-1" value={subForm.name} onChange={(e)=>setSubForm({...subForm,name:e.target.value})} required />
            <button className="px-3 py-1 rounded bg-gray-900 text-white text-sm">Add Subcategory</button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded border p-4">
        <h2 className="font-semibold mb-3">All Categories</h2>
        {groups.length===0 && <div className="text-sm text-gray-500">No categories</div>}
        <div className="space-y-4">
          {groups.map((g)=> (
            <div key={g.id} className="border rounded">
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                <div className="flex items-center gap-2">
                  <input className="border rounded px-2 py-1" defaultValue={g.name} onBlur={(e)=>update(g.id,{name:e.target.value})} />
                  <span className="text-xs text-gray-500">group</span>
                </div>
                <button className="text-red-600 text-xs" onClick={()=>remove(g.id)}>Delete</button>
              </div>
              <div className="p-3">
                {byParent[g.id].length===0 && <div className="text-xs text-gray-500">No subcategories</div>}
                <ul className="space-y-2">
                  {byParent[g.id].map((c)=> (
                    <li key={c.id} className="flex items-center justify-between">
                      <input className="border rounded px-2 py-1 w-72" defaultValue={c.name} onBlur={(e)=>update(c.id,{name:e.target.value})} />
                      <div className="flex items-center gap-2">
                        <input type="number" className="border rounded px-2 py-1 w-24" defaultValue={c.order||0} onBlur={(e)=>update(c.id,{order:Number(e.target.value)})} />
                        <button className="text-red-600 text-xs" onClick={()=>remove(c.id)}>Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
