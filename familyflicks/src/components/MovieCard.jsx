import { STREAMING_SERVICES } from '../constants/streamingServices'
import CertBadge from './CertBadge'

export const RESPONSES = [
  { key: 'Watched',        emoji: '✅', label: 'Watched' },
  { key: 'Interested',     emoji: '👀', label: 'Want'    },
  { key: 'Not Watched',    emoji: '⏭',  label: 'Skip'    },
  { key: 'Not Interested', emoji: '👎', label: 'Nope'    },
  { key: 'Inappropriate',  emoji: '🚫', label: 'Flag'    },
]

export const RESPONSE_BG = {
  'Watched':        '#15803d',
  'Interested':     '#1d4ed8',
  'Not Watched':    '#334155',
  'Not Interested': '#334155',
  'Inappropriate':  '#b91c1c',
}

function StreamingBadge({ serviceId, subscribed }) {
  const svc = STREAMING_SERVICES.find(s => s.id === serviceId)
  if (!svc) return null
  return (
    <span
      className="inline-flex items-center justify-center rounded font-bold text-white"
      style={{ background: svc.color, opacity: subscribed ? 1 : 0.28, fontSize: 7, width: 26, height: 14 }}
      title={svc.label}
    >
      {svc.abbr}
    </span>
  )
}

// Buttons are always tappable — tapping a different button changes the response.
export default function MovieCard({ movie, response, onResponse, subscribedServices }) {
  const isAnswered = !!response

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Poster + info */}
      <div className="flex gap-3 p-3">
        <div
          className="shrink-0 w-24 h-36 rounded-xl overflow-hidden flex items-center justify-center text-3xl"
          style={{ background: 'var(--color-surface-raised)' }}
        >
          {movie.poster_url
            ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" loading="lazy" />
            : '🎬'}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2 py-0.5">
          <div>
            <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">{movie.title}</h3>
            <p className="text-slate-500 text-xs mt-0.5">{movie.release_year}</p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <CertBadge cert={movie.cert} />
            {(movie.genres ?? []).slice(0, 2).map(g => (
              <span
                key={g}
                className="text-slate-400 rounded-full"
                style={{ fontSize: 10, background: 'var(--color-surface-raised)', padding: '2px 6px' }}
              >
                {g}
              </span>
            ))}
          </div>

          {movie.streaming?.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {movie.streaming.slice(0, 6).map(id => (
                <StreamingBadge key={id} serviceId={id} subscribed={subscribedServices?.has(id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Response buttons — always tappable, tap again to change */}
      <div className="grid grid-cols-5 gap-1.5 px-3 pb-3">
        {RESPONSES.map(({ key, emoji, label }) => {
          const isChosen = response === key
          return (
            <button
              key={key}
              onClick={() => onResponse(key)}
              className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all"
              style={{
                background: isChosen ? RESPONSE_BG[key] : 'var(--color-surface-raised)',
                opacity: isAnswered && !isChosen ? 0.35 : 1,
              }}
            >
              <span className="text-base leading-none">{emoji}</span>
              <span className="leading-none" style={{ fontSize: 9, color: isChosen ? 'white' : '#94a3b8' }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
