import { useMemo, useState } from 'react'

export default function CurrencyInput({ currency='EUR', value, onChange, ariaLabel, title, className='' }){
  const [invalid, setInvalid] = useState(false)

  const re = useMemo(()=>/^\d*(?:\.\d{0,2})?$/,[])

  function handleChange(e){
    const v = e.target.value
    if (v === '') { setInvalid(false); onChange?.(v); return }
    if (re.test(v)) { setInvalid(false); onChange?.(v) } else { setInvalid(true) }
  }

  function handleBlur(e){
    const v = e.target.value
    if (v === '' || invalid) return
    const n = Number(v)
    if (!isFinite(n) || n < 0) { setInvalid(true); return }
    const fixed = n.toFixed(2)
    onChange?.(fixed)
  }

  return (
    <div className={`flex items-center justify-end gap-1 ${className}`}>
      <span className="text-gray-500">{symbol(currency)}</span>
      <input
        aria-label={ariaLabel}
        title={title}
        inputMode="decimal"
        pattern="^\\d*(?:\\.\\d{0,2})?$"
        className={`input w-28 text-right ${invalid?'border-red-500':''}`}
        value={value ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  )
}

function symbol(currency){
  try {
    const parts = new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0)
    return parts.find(p=>p.type==='currency')?.value || currency
  } catch { return currency }
}
