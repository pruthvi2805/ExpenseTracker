import { useEffect, useMemo, useRef, useState } from 'react'

export default function ComboBox({ options, value, onChange, placeholder = 'Select…', getLabel = (o)=>o.label }){
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const selected = useMemo(() => options.find(o=>o.value===value) || null, [options, value])

  const filtered = useMemo(() => {
    if (!query) return options
    const q = query.toLowerCase()
    return options.filter(o => getLabel(o).toLowerCase().includes(q))
  }, [options, query, getLabel])

  useEffect(() => {
    function onDoc(e){
      if (!open) return
      if (!listRef.current) return
      if (!listRef.current.contains(e.target) && !inputRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function select(val){
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="border rounded px-2 py-1 w-full"
        placeholder={placeholder}
        value={open ? query : (selected ? getLabel(selected) : '')}
        onChange={(e)=>{ setQuery(e.target.value); setOpen(true) }}
        onFocus={()=> setOpen(true)}
      />
      {open && (
        <div ref={listRef} className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white shadow">
          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No matches</div>}
          {filtered.map((o) => (
            <div key={o.value} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer flex items-center justify-between" onMouseDown={()=>select(o.value)}>
              <span>{getLabel(o)}</span>
              {o.badge && <span className={`ml-2 text-[10px] rounded px-1.5 py-0.5 ${o.badge==='Variable'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-700'}`}>{o.badge}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

