import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useGdocService } from '../hooks/useGdocService'
import { fetchPosterPaths } from '../services/tmdbService'
import CertBadge from '../components/CertBadge'
import { RESPONSES, RESPONSE_BG } from '../components/MovieCard'

// ── Helpers ───────────────────────────────────────────────────────────────────

const SKIPPED_RESPONSES = new Set(['Not Watched', 'Not Interested', 'Inappropriate'])

function isAdultCert(cert) {
  return cert === '16' || cert === '18'
}

function filterByAudience(items, audienceMode) {
  return items.filter(item => isAdultCert(item.cert) === (audienceMode === 'adults'))
}

function applyResponseFilter(audienceItems, filterKey, currentResponses) {
  return audienceItems.filter(item => {
    const r = currentResponses[item.tmdb_id] ?? item.response
    if (filterKey === 'skipped') return SKIPPED_RESPONSES.has(r)
    return r === filterKey
  })
}

// ── ListItem ──────────────────────────────────────────────────────────────────

function ListItem({ item, response, rating, posterUrl, onResponseChange, onRatingCommit }) {
  const [sliderOpen, setSliderOpen]   = useState(rating !== null)
  const [localRating, setLocalRating] = useState(rating ?? 5)
  const [committed, setCommitted]     = useState(rating !== null)

  useEffect(() => {
    if (rating !== null) {
      setLocalRating(rating)
      setSliderOpen(true)
      setCommitted(true)
    }
  }, [rating])

  const showRating = response === 'Watched' || response === 'Interested'

  function handleSliderCommit(value) {
    setCommitted(true)
    onRatingCommit(value)
  }

  function handleCancel() {
    setSliderOpen(false)
    setLocalRating(rating ?? 5)
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

      {/* Response buttons */}
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
                  {!committed && (
                    <button onClick={handleCancel} className="text-xs text-slate-500 underline">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range" min="1" max="10" step="1"
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

  const [phase, setPhase]               = useState('loading')
  const [audienceMode, setAudienceMode] = useState('children')
  const [filter, setFilter]             = useState('Interested')
  const [allItems, setAllItems]         = useState([])
  const [ratings, setRatings]           = useState({})
  const [responses, setResponses]       = useState({})
  const [displayedItems, setDisplayedItems] = useState([])
  const [posterUrls, setPosterUrls]     = useState({})

  useEffect(() => {
    if (!isGoogleConnected) { setPhase('no-auth'); return }
    loadList()
  }, [isGoogleConnected]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadList() {
    setPhase('loading')
    try {
      await gdoc.findOrCreateSheet()
      const suggestions = await gdoc.readSuggestions()

      // Load all movies that have any response
      const allRaw = suggestions.filter(s => s.response)

      // Deduplicate by tmdb_id — keep the last (most recent) row
      const uniqueMap = new Map()
      allRaw.forEach(s => uniqueMap.set(s.tmdb_id, s))
      const all = [...uniqueMap.values()]

      if (all.length === 0) { setPhase('empty'); return }

      const initialRatings   = {}
      const initialResponses = {}
      all.forEach(s => {
        if (s.rating != null) initialRatings[s.tmdb_id] = s.rating
        initialResponses[s.tmdb_id] = s.response
      })

      // Sort: unrated first, then rated descending
      const sorted = [...all].sort((a, b) => {
        const ra = initialRatings[a.tmdb_id] ?? null
        const rb = initialRatings[b.tmdb_id] ?? null
        if (ra === null && rb === null) return 0
        if (ra === null) return -1
        if (rb === null) return 1
        return rb - ra
      })

      const defaultMode   = 'children'
      const defaultFilter = 'Interested'

      setAudienceMode(defaultMode)
      setFilter(defaultFilter)
      setAllItems(sorted)
      setRatings(initialRatings)
      setResponses(initialResponses)

      const audienceItems = filterByAudience(sorted, defaultMode)
      setDisplayedItems(applyResponseFilter(audienceItems, defaultFilter, initialResponses))
      setPhase('ready')

      fetchPosterPaths(sorted.map(s => s.tmdb_id))
        .then(urls => setPosterUrls(urls))
        .catch(() => {})
    } catch {
      setPhase('error')
    }
  }

  function handleAudienceModeChange(newMode) {
    setAudienceMode(newMode)
    const audienceItems = filterByAudience(allItems, newMode)
    setDisplayedItems(applyResponseFilter(audienceItems, filter, responses))
  }

  function handleFilterChange(newFilter) {
    setFilter(newFilter)
    const audienceItems = filterByAudience(allItems, audienceMode)
    setDisplayedItems(applyResponseFilter(audienceItems, newFilter, responses))
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
            Respond to movie suggestions and they'll appear here.
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

  const ratedCount = displayedItems.filter(item => ratings[item.tmdb_id] != null).length

  const FILTERS = [
    { key: 'Interested', label: '👀 To Watch' },
    { key: 'Watched',    label: '✅ Watched'  },
    { key: 'skipped',    label: '⏭️ Skipped'   },
  ]

  return (
    <div className="flex flex-col" style={{ minHeight: '100%', background: 'var(--color-bg)' }}>
      <div className="px-6 pt-8 pb-3">
        <h1 className="text-xl font-bold text-white">My List</h1>
      </div>

      {/* Audience toggle */}
      <div className="flex gap-2 px-6 pb-3">
        <button
          onClick={() => handleAudienceModeChange('children')}
          className="px-4 py-2 rounded-full text-sm font-medium transition-all"
          style={{
            background: audienceMode === 'children' ? '#15803d' : 'var(--color-surface)',
            border:     audienceMode === 'children' ? 'none' : '1px solid var(--color-border)',
            color:      audienceMode === 'children' ? 'white' : '#94a3b8',
          }}
        >
          👪 Family
        </button>
        <button
          onClick={() => handleAudienceModeChange('adults')}
          className="px-4 py-2 rounded-full text-sm font-medium transition-all"
          style={{
            background: audienceMode === 'adults' ? '#1d4ed8' : 'var(--color-surface)',
            border:     audienceMode === 'adults' ? 'none' : '1px solid var(--color-border)',
            color:      audienceMode === 'adults' ? 'white' : '#94a3b8',
          }}
        >
          🍿 Adults
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-6 pb-4 overflow-x-auto">
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => handleFilterChange(key)}
                  className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: filter === key ? '#6366f1' : 'var(--color-surface)',
                    border:     filter === key ? 'none' : '1px solid var(--color-border)',
                    color:      filter === key ? 'white' : '#94a3b8',
                  }}>
            {label}
          </button>
        ))}
        <span className="ml-auto shrink-0 self-center text-xs text-slate-500">
          {displayedItems.length} movie{displayedItems.length !== 1 ? 's' : ''}
          {ratedCount > 0 && ` · ${ratedCount} rated`}
        </span>
      </div>

      {displayedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 px-6 gap-4 text-center">
          <div className="text-4xl">
            {filter === 'Interested' ? '👀' : filter === 'Watched' ? '✅' : '⏭️'}
          </div>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            {filter === 'Interested'
              ? 'No movies marked as Want to Watch yet.'
              : filter === 'Watched'
              ? 'No watched movies yet.'
              : 'No skipped movies yet.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 px-6 pb-8 space-y-3">
          {displayedItems.map(item => (
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
