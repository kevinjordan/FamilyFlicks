const DECADES = [
  { value: 1980, label: '1980s' },
  { value: 1990, label: '1990s' },
  { value: 2000, label: '2000s' },
  { value: 2010, label: '2010s' },
  { value: 2020, label: '2020s' },
]

export default function StepDecade({ value, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Earliest decade</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          We'll suggest movies from this decade onwards. Classics from the 80s and 90s are often great family picks.
        </p>
      </div>

      {/* Horizontal scroll of decade chips */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {DECADES.map(dec => {
          const selected = value === dec.value
          return (
            <button
              key={dec.value}
              onClick={() => onChange(dec.value)}
              className="shrink-0 snap-start px-6 py-4 rounded-2xl font-semibold text-sm transition-all"
              style={{
                background: selected ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--color-surface)',
                border: selected ? 'none' : '1px solid var(--color-border)',
                color: selected ? 'white' : '#94a3b8',
              }}
            >
              {dec.label}
            </button>
          )
        })}
      </div>

      {/* Summary card */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-white text-sm font-medium">
          Movies from <span style={{ color: '#818cf8' }}>{value}</span> to present
        </p>
        <p className="text-slate-500 text-xs mt-1">
          This applies to every suggestion session
        </p>
      </div>
    </div>
  )
}
