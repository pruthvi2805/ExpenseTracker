import { useEffect, useState } from 'react'
import { on, Events } from '../lib/bus.js'

export default function ToastHub(){
  const [toasts, setToasts] = useState([])
  useEffect(()=>{
    const off = on(Events.Toast, add)
    return ()=>{ off() }
  },[])
  function add(t){
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    const item = { id, duration: 6000, ...t }
    setToasts((arr)=> [...arr, item])
    if (item.duration) setTimeout(()=> dismiss(id), item.duration)
  }
  function dismiss(id){ setToasts((arr)=> arr.filter(t=>t.id!==id)) }
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 space-y-2 w-[92%] sm:w-auto">
      {toasts.map(t=> (
        <div key={t.id} className="bg-gray-900 text-white rounded-xl shadow px-3 py-2 text-sm flex items-center gap-3">
          <span>{t.message}</span>
          {t.actionLabel && (
            <button className="px-2 py-1 rounded bg-emerald-500 text-gray-900 text-xs" onClick={()=>{ try{t.onAction?.()} finally{dismiss(t.id)} }}> {t.actionLabel} </button>
          )}
          <button className="ml-auto text-xs text-gray-300" onClick={()=>dismiss(t.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  )
}
