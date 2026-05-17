import Toggle from '../Toggle'
import { CERTS, CERT_COLORS } from '../../constants/certs'

const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth']

function suggestCert(age) {
  if (age <= 5)  return 'G'
  if (age <= 11) return 'PG'
  if (age <= 14) return '12A'
  if (age <= 15) return '15A'
  if (age <= 17) return '16'
  return '18'
}

export default function StepChildDetail({ childIndex, value, age, onAgeChange, onChange }) {
  function handleAgeStep(delta) {
    const newAge = Math.max(0, Math.min(99, age + delta))
    onAgeChange(newAge)
    onChange({ ...value, maxCert: suggestCert(newAge) })
  }

  const label    = ORDINALS[childIndex] ?? `Person ${childIndex + 1}`
  const isAdult  = value.maxCert === '18'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{label} person</h2>
        <p className="text-slate-400 text-sm">
          {isAdult
            ? 'Adult viewer — no cert restrictions.'
            : 'Adjust the age to auto-suggest a cert, then confirm or change it.'}
        </p>
      </div>

      {/* Age stepper */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-slate-500 text-xs mb-4">Age (not saved — used only to suggest a cert)</p>
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleAgeStep(-1)}
            className="w-12 h-12 rounded-full text-2xl font-bold flex items-center justify-center"
            style={{ background: 'var(--color-surface-raised)', color: '#94a3b8' }}
          >
            −
          </button>
          <span className="text-5xl font-bold text-white tabular-nums">{age}</span>
          <button
            onClick={() => handleAgeStep(1)}
            className="w-12 h-12 rounded-full text-2xl font-bold flex items-center justify-center"
            style={{ background: 'var(--color-surface-raised)', color: '#94a3b8' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Cert picker */}
      <div>
        <p className="text-slate-300 text-sm font-medium mb-3">Maximum certificate</p>
        <div className="grid grid-cols-3 gap-2">
          {CERTS.map(cert => {
            const selected = value.maxCert === cert
            return (
              <button
                key={cert}
                onClick={() => onChange({ ...value, maxCert: cert })}
                className="py-3 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: selected ? CERT_COLORS[cert] : 'var(--color-surface)',
                  border: selected ? 'none' : '1px solid var(--color-border)',
                  color: selected ? 'white' : '#94a3b8',
                }}
              >
                {cert}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-600 mt-2">G is safest · 15A suits teens · 18 = adult viewer</p>
      </div>

      {/* Nudge toggle — hidden for adults (nothing above 18) */}
      {!isAdult && (
        <div
          className="rounded-2xl p-4 flex items-center justify-between gap-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex-1">
            <p className="text-white text-sm font-medium">Suggest slightly older movies sometimes?</p>
            <p className="text-slate-500 text-xs mt-1">Allows up to 2 picks rated one cert above their limit</p>
          </div>
          <Toggle
            value={value.nudgeEnabled}
            onChange={nudgeEnabled => onChange({ ...value, nudgeEnabled })}
          />
        </div>
      )}
    </div>
  )
}
