import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useGdocService } from '../hooks/useGdocService'
import { fetchPosterPaths } from '../services/tmdbService'
import CertBadge from '../components/CertBadge'
import { RESPONSES, RESPONSE_BG } from '../components/MovieCard'

// ── ListItem ──────────────────────────────────────────────────────────────────

function ListItem({ item, response, rating, posterUrl, onResponseChange, onRatingCommit }) {
  const [sliderOpen, setSliderOpen]   = useState(rating !== null)
  const [localRating, setLocalRating] = useState(rating ?? 5)
  const [committed, setCommitted]     = useState(rating !== null)

  // Sync when rating arrives from GDoc after the initial render
  useEffect(() => {
    if (rating !== null) {
      setLocalRating(rating)
      setSliderOpen(true)
      setCommitted(true)
    }
  }, [rating])

  // Only show the rating section when the current response is Watched or Interested
  const showRating = response === 'Watched' || response === 'Interested'

  function handleSliderCommit(value) {
    setCommitted(true)
    onRatingCommit(value)
  }

  function handleCancel() {
    setSliderOpen(false)
    setLocalRating(rating ?? 5) // restore previous value
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Movie info */}
      <div className="flex gap-3 p-3">
        <div
          className="shrink-0 w-14 h-20 rounded-lg overflow-hidden flex items-center justify-center text-2xl"
          style={{ background: 'var(--color-surface-raised)' }}
        >
          {posterUrl
            ? <img src={posterUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : '🎬'}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white text-sm font-semibold leading-snug line-clamp-2">{item.title}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <CertBadge cert={item.cert} />
            {item.release_year && <span className="text-slate-500 text-xs">{item.release_year}</span>}
          </div>
        </div>
      </div>

      {/* Response buttons — tap to change vote */}
      <div className="grid grid-cols-5 gap-1.5 px-3 pb-3">
        {RESPONSES.map(({ key, emoji, label }) => {
          const isChosen = response === key
          return (
            <button
              key={key}
              onClick={() => onResponseChange(key)}
              className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all"
              style={{
                background: isChosen ? RESPONSE_BG[key] : 'var(--color-surface-raised)',
                opacity: !isChosen && response ? 0.4 : 1,
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

      {/* Rating — only for Watched / Interested */}
      {showRating && (
        <div className="px-3 pb-3">
          {!sliderOpen ? (
            <button
              onClick={() => setSliderOpen(true)}
              className="w-full text-xs py-2 rounded-xl text-center"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px dashed rgba(255,255,255,0.1)',
                color: '#64748b',
              }}
            >
              Tap to rate
            </button>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Your rating</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: committed ? '#818cf8' : '#475569' }}>
                    {committed ? `${localRating} / 10` : '—'}
                  </span>
                  {/* Cancel is only available before the first commit */}
                  {!committed && (
                    <button onClick={handleCancel} className="text-xs text-slate-500 underline">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min="1" max="10" step="1"
                value={localRating}
                onChange={e => setLocalRating(Number(e.target.value))}
                onMouseUp={e => handleSliderCommit(Number(e.target.value))}
                onTouchEnd={e => handleSliderCommit(Number(e.currentTarget.value))}
                className="w-full"
                style={{ accentColor: '#6366f1' }}
              />
              <div className="flex justify-between text-slate-600" style={{ fontSize: 9 }}>
                <span>1</span><span>5</span><span>10</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── MyListScreen ──────────────────────────────────────────────────────────────

export default function MyListScreen() {
  const { isGoogleConnected } = useApp()
  const gdoc = useGdocService()
  const navigate = useNavigate()

  const [phase, setPhase]         = useState('loading')
  const [items, setItems]         = useState([])       // pre-sorted on load, stable thereafter
  const [ratings, setRatings]     = useState({})       // { [tmdb_id]: number }
  const [responses, setResponses] = useState({})       // { [tmdb_id]: responseKey } — tracks overrides
  const [posterUrls, setPosterUrls] = useState({})
  const [filter, setFilter]       = useState('Interested')

  useEffect(() => {
    if (!isGoogleConnected) { setPhase('no-auth'); return }
    loadList()
  }, [isGoogleConnected]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadList() {
    setPhase('loading')
    try {
      await gdoc.findOrCreateSheet()
      const suggestions = await gdoc.readSuggestions()

      const watched = suggestions.filter(
        s => s.response === 'Watched' || s.response === 'Interested'
      )

      if (watched.length === 0) { setPhase('empty'); return }

      const initialRatings = {}
      const initialResponses = {}
      watched.forEach(s => {
        if (s.rating != null) initialRatings[s.tmdb_id] = s.rating
        initialResponses[s.tmdb_id] = s.response
      })

      // Sort once: unrated first, then by rating descending
      const sorted = [...watched].sort((a, b) => {
        const ra = initialRatings[a.tmdb_id] ?? null
        const rb = initialRatings[b.tmdb_id] ?? null
        if (ra === null && rb === null) return 0
        if (ra === null) return -1
        if (rb === null) return 1
        return rb - ra
      })

      setItems(sorted)
      setRatings(initialRatings)
      setResponses(initialResponses)
      setPhase('ready')

      fetchPosterPaths(sorted.map(s => s.tmdb_id))
        .then(urls => setPosterUrls(urls))
        .catch(() => {})
    } catch {
      setPhase('error')
    }
  }

  function handleResponseChange(tmdbId, responseKey) {
    setResponses(prev => ({ ...prev, [tmdbId]: responseKey }))
    gdoc.updateResponse(tmdbId, responseKey)
  }

  function handleRatingCommit(tmdbId, value) {
    setRatings(prev => ({ ...prev, [tmdbId]: value }))
    gdoc.writeRating(tmdbId, value)
  }

  // ── Phases ────────────────────────────────────────────────────────────────

  if (phase === 'no-auth') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 gap-6 text-center"
           style={{ background: 'var(--color-bg)' }}>
        <div className="text-5xl">⭐</div>
        <div className="space-y-2">
          <h2 className="text-white text-lg font-semibold">My List</h2>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            Connect Google in Settings to save your watch history and rate movies here.
          </p>
        </div>
        <button onClick={() => navigate('/settings')}
                className="px-8 py-3 rounded-2xl font-semibold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          Go to Settings →
        </button>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-4"
           style={{ background: 'var(--color-bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm">Loading your list…</p>
      </div>
    )
  }

  if (phase === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 gap-6 text-center"
           style={{ background: 'var(--color-bg)' }}>
        <div className="text-5xl">🍿</div>
        <div className="space-y-2">
          <h2 className="text-white font-semibold">Nothing here yet</h2>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            Mark movies as Watched or Interested in the Suggestions screen and they'll appear here.
          </p>
        </div>
        <button onClick={() => navigate('/')}
                className="px-8 py-3 rounded-2xl font-semibold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          Get Suggestions →
        </button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 gap-6 text-center"
           style={{ background: 'var(--color-bg)' }}>
        <div className="text-5xl">😕</div>
        <div className="space-y-2">
          <h2 className="text-white font-semibold">Couldn't load your list</h2>
          <p className="text-slate-400 text-sm">Check your connection and try again.</p>
        </div>
        <button onClick={loadList}
                className="px-8 py-3 rounded-2xl font-semibold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          Try again
        </button>
      </div>
    )
  }

  // ── Ready ─────────────────────────────────────────────────────────────────

  // Filter uses local `responses` state so changes take effect immediately
  const filtered = items.filter(item => (responses[item.tmdb_id] ?? item.response) === filter)
  const ratedCount = filtered.filter(item => ratings[item.tmdb_id] != null).length

  const FILTERS = [
    { key: 'Interested', label: '👀 To Watch' },
    { key: 'Watched',    label: '✅ Watched'  },
  ]

  return (
    <div className="flex flex-col" style={{ minHeight: '100%', background: 'var(--color-bg)' }}>
      <div className="px-6 pt-8 pb-3">
        <h1 className="text-xl font-bold text-white">My List</h1>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-6 pb-4">
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: filter === key ? '#6366f1' : 'var(--color-surface)',
                    border:     filter === key ? 'none' : '1px solid var(--color-border)',
                    color:      filter === key ? 'white' : '#94a3b8',
                  }}>
            {label}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-slate-500">
          {filtered.length} movie{filtered.length !== 1 ? 's' : ''}
          {ratedCount > 0 && ` · ${ratedCount} rated`}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 px-6 gap-4 text-center">
          <div className="text-4xl">{filter === 'Interested' ? '👀' : '✅'}</div>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            {filter === 'Interested'
              ? 'No movies marked as Want to Watch yet. Respond to suggestions to build your list.'
              : 'No watched movies yet. Mark suggestions as Watched to track them here.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 px-6 pb-8 space-y-3">
          {filtered.map(item => (
            <ListItem
              key={item.tmdb_id}
              item={item}
              response={responses[item.tmdb_id] ?? item.response}
              rating={ratings[item.tmdb_id] ?? null}
              posterUrl={posterUrls[item.tmdb_id] ?? null}
              onResponseChange={key => handleResponseChange(item.tmdb_id, key)}
              onRatingCommit={v => handleRatingCommit(item.tmdb_id, v)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
