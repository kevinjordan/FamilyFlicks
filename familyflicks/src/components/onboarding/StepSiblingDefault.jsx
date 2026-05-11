const OPTIONS = [
  {
    value: 'youngest',
    label: "Youngest child's limit",
    desc: 'Safest option — all children can watch everything suggested.',
    icon: '🛡️',
  },
  {
    value: 'eldest',
    label: "Eldest child's limit",
    desc: 'More choices for older children — younger ones may need supervision.',
    icon: '🎬',
  },
]

const CHECK = (
  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function StepSiblingDefault({ value, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Sibling cert limit</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Your children have different cert limits. When suggesting movies, which child's maximum should we use?
        </p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map(opt => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="w-full text-left rounded-2xl p-4 flex items-start gap-4 transition-all"
              style={{
                background: selected ? 'rgba(99,102,241,0.15)' : 'var(--color-surface)',
                border: selected ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
              }}
            >
              <span className="text-2xl mt-0.5">{opt.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: selected ? '#a5b4fc' : 'white' }}>
                  {opt.label}
                </p>
                <p className="text-slate-400 text-xs mt-1">{opt.desc}</p>
              </div>
              {selected && (
                <div
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                  style={{ background: '#6366f1' }}
                >
                  {CHECK}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
