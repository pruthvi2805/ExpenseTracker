export default function PageHeader({ title, right }){
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-semibold">{title}</h2>
      <div className="text-xs text-gray-600">{right}</div>
    </div>
  )
}

