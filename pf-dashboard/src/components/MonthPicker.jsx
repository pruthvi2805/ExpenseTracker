import { useMonth, nextMonthKey, prevMonthKey } from '../lib/monthContext.jsx'

export function MonthPicker() {
  const { monthKey, setMonthKey } = useMonth()

  return (
    <div className="flex items-center gap-2">
      <button className="px-2 py-1 rounded border text-sm" onClick={() => setMonthKey(prevMonthKey(monthKey))}>
        ◀
      </button>
      <input
        type="month"
        className="border rounded px-2 py-1 text-sm"
        value={monthKey}
        onChange={(e) => setMonthKey(e.target.value)}
      />
      <button className="px-2 py-1 rounded border text-sm" onClick={() => setMonthKey(nextMonthKey(monthKey))}>
        ▶
      </button>
    </div>
  )
}

