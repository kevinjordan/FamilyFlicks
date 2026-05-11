import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { useApp } from '../context/AppContext'
import { useGdocService } from '../hooks/useGdocService'
import { fetchCandidates } from '../services/tmdbService'
import { selectSuggestions } from '../services/suggestionEngine'
import MovieCard from '../components/MovieCard'

export default function SuggestionsScreen() {
  const { familyProfile, isGoogleConnected, isOnline } = useApp()
  const gdoc = useGdocService()

  const [phase, setPhase] = useState('idle')
  const [movies, setMovies] = useState([])
  const [responses, setResponses] = useState({})
  const [errorMsg, setErrorMsg] = useState('')

  const sessionDate = useRef(new Date().toISOString())
  const topRef = useRef(null)

  const answeredCount = Object.keys(responses).length
  const canGoAgain = answeredCount >= 5

  const subscribedServices = new Set(familyProfile.streamingServices ?? [])

  async function runSession(additionalExcludeIds = []) {
    setPhase('loading')
    setResponses({})
    sessionDate.current = new Date().toISOString()
    topRef.current?.scrollIntoView({ behavior: 'instant' })

    try {
      let excludeIds = [...additionalExcludeIds]

      if (isGoogleConnected) {
        try {
          await gdoc.findOrCreateSheet()
          const history = await gdoc.readSuggestions()
          const historyIds = history.map(r => r.tmdb_id)
          excludeIds = [...new Set([...excludeIds, ...historyIds])]
        } catch {
          toast.error('Could not load watch history — some movies may repeat', { id: 'history-err' })
        }
      }

      const candidates = await fetchCandidates(familyProfile, excludeIds)
      const selected = selectSuggestions(candidates, familyProfile)

      if (selected.length === 0) {
        setErrorMsg(
          candidates.length === 0
            ? "You've seen everything matching your settings! Try widening your decade or cert range."
            : "No movies matched your cert settings. Try adjusting them in Settings."
        )
        setPhase('error')
        return
      }

      setMovies(selected)
      setPhase('ready')
    } catch (err) {
      console.error('[SuggestionsScreen]', err)
      setErrorMsg('Failed to load suggestions. Check your connection and try again.')
      setPhase('error')
    }
  }

  function handleResponse(movie, responseKey) {
    const previous = responses[movie.tmdb_id]
    if (previous === responseKey) return // tapped same button — no change

    setResponses(prev => ({ ...prev, [movie.tmdb_id]: responseKey }))

    if (isGoogleConnected) {
      if (previous) {
        // Already have a GDoc row — update the response column
        gdoc.updateResponse(movie.tmdb_id, responseKey)
      } else {
        // First response — append a new row
        gdoc.writeSuggestion({
          tmdb_id:      movie.tmdb_id,
          title:        movie.title,
          cert:         movie.cert,
          genres:       movie.genres,
          release_year: movie.release_year,
          response:     responseKey,
          session_date: sessionDate.current,
        })
      }
    }
  }

  // ── Idle ──────────────────────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 gap-8 py-12"
           style={{ background: 'var(--color-bg)' }}>
        <div className="text-center space-y-3">
          <div
            className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            🎬
          </div>
          <h1 className="text-2xl font-bold text-white">Movie Night</h1>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            Get 10 personalised picks matched to every child in the room.
          </p>
        </div>

        {!isGoogleConnected && (
          <div
            className="w-full max-w-sm rounded-2xl p-4"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <p className="text-slate-400 text-xs leading-relaxed">
              Connect Google in Settings to save your watch history and avoid seeing the same movies twice.
            </p>
          </div>
        )}

        <button
          onClick={() => runSession()}
          disabled={!isOnline}
          className="w-full max-w-sm py-4 rounded-2xl font-semibold text-white text-base transition-opacity hover:opacity-90 active:opacity-75 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          {isOnline ? 'Get Suggestions' : 'No connection'}
        </button>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-5"
           style={{ background: 'var(--color-bg)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-white text-sm font-medium">Finding movies for your family…</p>
          <p className="text-slate-500 text-xs">This takes a few seconds</p>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 gap-6 text-center"
           style={{ background: 'var(--color-bg)' }}>
        <div className="text-5xl">😕</div>
        <div className="space-y-2">
          <h2 className="text-white font-semibold">Couldn't load suggestions</h2>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">{errorMsg}</p>
        </div>
        <button
          onClick={() => runSession()}
          className="px-8 py-3 rounded-2xl font-semibold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          Try again
        </button>
      </div>
    )
  }

  // ── Ready ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ minHeight: '100%', background: 'var(--color-bg)' }}>
      <div ref={topRef} />

      <div className="px-6 pt-8 pb-4">
        <h1 className="text-xl font-bold text-white">Tonight's picks</h1>
        <p className="text-slate-500 text-sm mt-1">
          {answeredCount === 0
            ? `${movies.length} movies — tap to respond, tap again to change`
            : `${answeredCount} of ${movies.length} answered`}
          {!isGoogleConnected && ' · responses not saved (connect Google)'}
        </p>
      </div>

      <div className="flex-1 px-6 pb-6 space-y-4">
        {movies.map(movie => (
          <MovieCard
            key={movie.tmdb_id}
            movie={movie}
            response={responses[movie.tmdb_id]}
            onResponse={key => handleResponse(movie, key)}
            subscribedServices={subscribedServices}
          />
        ))}
        {canGoAgain && <div className="h-20" />}
      </div>

      {canGoAgain && (
        <div
          className="sticky bottom-0 px-6 py-4"
          style={{ background: 'linear-gradient(to top, var(--color-bg) 65%, transparent)' }}
        >
          <button
            onClick={() => runSession(movies.map(m => m.tmdb_id))}
            className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-opacity hover:opacity-90 active:opacity-75"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            Go Again →
          </button>
        </div>
      )}
    </div>
  )
}
