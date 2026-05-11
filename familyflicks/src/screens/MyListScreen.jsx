import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useGdocService } from '../hooks/useGdocService'
import { fetchPosterPaths } from '../services/tmdbService'
import CertBadge from '../components/CertBadge'

// ── ListItem ──────────────────────────────────────────────────────────────────

function ListItem({ item, rating, posterUrl, onRatingChange, onRatingCommit }) {
  // touched: true once user drags slider or there's an existing rating
  const [touched, setTouched] = useState(rating !== null)

  // Sync if the parent rating prop arrives after first render (GDoc data)
  useEffect(() => {
    if (rating !== null) setTouched(true)
  }, [rating])

  const sliderValue = rating ?? 5

  function handleChange(e) {
    setTouched(true)
    onRatingChange(Number(e.target.value))
  }

  function handleCommit(e) {
    onRatingCommit(Number(e.currentTarget.value))
  }

  const isWatched = item.response === 'Watched'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Movie info row */}
      <div className="flex gap-3 p-3">
        {/* Poster — w185 size */}
        <div
          className="shrink-0 w-14 h-20 rounded-lg overflow-hidden flex items-center justify-center text-2xl"
          style={{ background: 'var(--color-surface-raised)' }}
        >
          {posterUrl
            ? <img src={posterUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : '🎬'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-sm font-semibold leading-snug line-clamp-2">{item.title}</h3>

          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <CertBadge cert={item.cert} />
            {item.release_year && (
              <span className="text-slate-500 text-xs">{item.release_year}</span>
            )}
            <span
              className="ml-auto text-xs rounded-full"
              style={{
                padding: '2px 7px',
                background: isWatched ? 'rgba(22,163,74,0.15)' : 'rgba(37,99,235,0.15)',
                color:      isWatched ? '#4ade80'              : '#60a5fa',
              }}
            >
              {isWatched ? '✅ Watched' : '👀 Interested'}
            </span>
          </div>
        </div>
      </div>

      {/* Rating area */}
      <div className="px-3 pb-3">
        {!touched ? (
          <button
            onClick={() => setTouched(true)}
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
              <span className="text-sm font-bold" style={{ color: rating !== null ? '#818cf8' : '#475569' }}>
                {rating !== null ? `${rating} / 10` : '—'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={sliderValue}
              onChange={handleChange}
              onMouseUp={handleCommit}
              onTouchEnd={handleCommit}
              className="w-full"
              style={{ accentColor: '#6366f1' }}
            />
            <div
              className="flex justify-between text-slate-600"
              style={{ fontSize: 9 }}
            >
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MyListScreen ──────────────────────────────────────────────────────────────

export default function MyListScreen() {
  const { isGoogleConnected } = useApp()
  const gdoc = useGdocService()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('loading') // 'loading'|'ready'|'empty'|'error'|'no-auth'
  const [items, setItems] = useState([])         // pre-sorted on load, stable thereafter
  const [ratings, setRatings] = useState({})     // { [tmdb_id]: number }
  const [posterUrls, setPosterUrls] = useState({})
  const [filter, setFilter] = useState('Interested') // 'Interested' | 'Watched'

  useEffect(() => {
    if (!isGoogleConnected) {
      setPhase('no-auth')
      return
    }
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

      if (watched.length === 0) {
        setPhase('empty')
        return
      }

      // Build initial ratings map from GDoc data
      const initialRatings = {}
      watched.forEach(s => {
        if (s.rating != null) initialRatings[s.tmdb_id] = s.rating
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
      setPhase('ready')

      // Fetch poster images in the background — doesn't block rendering
      fetchPosterPaths(sorted.map(s => s.tmdb_id))
        .then(urls => setPosterUrls(urls))
        .catch(() => {}) // non-critical
    } catch {
      setPhase('error')
    }
  }

  function handleRatingChange(tmdbId, value) {
    setRatings(prev => ({ ...prev, [tmdbId]: value }))
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
        <button
          onClick={() => navigate('/settings')}
          className="px-8 py-3 rounded-2xl font-semibold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
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
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 rounded-2xl font-semibold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
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
        <button
          onClick={loadList}
          className="px-8 py-3 rounded-2xl font-semibold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          Try again
        </button>
      </div>
    )
  }

  // ── Ready ─────────────────────────────────────────────────────────────────

  const filtered = items.filter(item => item.response === filter)
  const ratedCount = filtered.filter(item => ratings[item.tmdb_id] != null).length

  const FILTERS = [
    { key: 'Interested', label: '👀 To Watch' },
    { key: 'Watched',    label: '✅ Watched'  },
  ]

  return (
    <div className="flex flex-col" style={{ minHeight: '100%', background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-3">
        <h1 className="text-xl font-bold text-white">My List</h1>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-6 pb-4">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: filter === key ? '#6366f1' : 'var(--color-surface)',
              border:     filter === key ? 'none' : '1px solid var(--color-border)',
              color:      filter === key ? 'white' : '#94a3b8',
            }}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-slate-500">
          {filtered.length} movie{filtered.length !== 1 ? 's' : ''}
          {ratedCount > 0 && ` · ${ratedCount} rated`}
        </span>
      </div>

      {/* List */}
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
              rating={ratings[item.tmdb_id] ?? null}
              posterUrl={posterUrls[item.tmdb_id] ?? null}
              onRatingChange={v => handleRatingChange(item.tmdb_id, v)}
              onRatingCommit={v => handleRatingCommit(item.tmdb_id, v)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
