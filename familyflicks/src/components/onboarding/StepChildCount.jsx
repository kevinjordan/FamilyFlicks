export default function StepChildCount({ value, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Who's in your household?</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Set a cert limit for each person. Choosing 18 marks them as an adult viewer. No names are stored.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(n => {
          const selected = value === n
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className="py-6 rounded-2xl text-3xl font-bold transition-all"
              style={{
                background: selected ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--color-surface)',
                border: selected ? 'none' : '1px solid var(--color-border)',
                color: selected ? 'white' : '#94a3b8',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-slate-600 text-center">You can change this later in Settings</p>
    </div>
  )
}
