import { useState } from 'react'
import { STREAMING_SERVICES } from '../../constants/streamingServices'

const CHECK = (
  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
    <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function StepStreaming({ value, onChange }) {
  const [query, setQuery] = useState('')

  const filtered = STREAMING_SERVICES.filter(s =>
    s.label.toLowerCase().includes(query.toLowerCase())
  )

  function toggle(id) {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Streaming services</h2>
        <p className="text-slate-400 text-sm">
          Select the services you subscribe to. We'll highlight which of your services carries each movie.
        </p>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <span className="text-slate-500">🔍</span>
        <input
          type="text"
          placeholder="Search services…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm outline-none"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-slate-500 text-lg leading-none">×</button>
        )}
      </div>

      {/* Service grid */}
      <div className="grid grid-cols-3 gap-3">
        {filtered.map(service => {
          const selected = value.includes(service.id)
          return (
            <button
              key={service.id}
              onClick={() => toggle(service.id)}
              className="relative flex flex-col items-center gap-2 py-4 px-2 rounded-2xl transition-all"
              style={{
                background: selected ? 'rgba(99,102,241,0.15)' : 'var(--color-surface)',
                border: selected ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                style={{ background: service.color }}
              >
                {service.abbr}
              </div>
              <span
                className="text-xs text-center leading-tight"
                style={{ color: selected ? '#a5b4fc' : '#94a3b8' }}
              >
                {service.label}
              </span>
              {selected && (
                <div
                  className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: '#6366f1' }}
                >
                  {CHECK}
                </div>
              )}
            </button>
          )
        })}

        {filtered.length === 0 && (
          <p className="col-span-3 text-center text-slate-500 text-sm py-4">No services match "{query}"</p>
        )}
      </div>

      <p className="text-center text-xs" style={{ color: value.length ? '#818cf8' : '#475569' }}>
        {value.length
          ? `${value.length} service${value.length !== 1 ? 's' : ''} selected`
          : 'No services selected — streaming badges will still appear for all providers'}
      </p>
    </div>
  )
}
