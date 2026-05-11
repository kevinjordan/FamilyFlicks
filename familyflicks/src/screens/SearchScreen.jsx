import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useApp } from '../context/AppContext'
import { useGdocService } from '../hooks/useGdocService'
import { searchMovies, GENRE_NAMES } from '../services/tmdbService'
import MovieCard from '../components/MovieCard'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'

function toMovieCardFormat(tmdbResult) {
  return {
    tmdb_id:      tmdbResult.id,
    title:        tmdbResult.title,
    genres:       (tmdbResult.genre_ids ?? []).map(id => GENRE_NAMES[id]).filter(Boolean),
    release_year: tmdbResult.release_date ? Number(tmdbResult.release_date.slice(0, 4)) : null,
    cert:         '',       // not fetched for search results
    streaming:    [],       // not fetched for search results
    poster_url:   tmdbResult.poster_path ? `${TMDB_IMAGE_BASE}${tmdbResult.poster_path}` : null,
    vote_average: tmdbResult.vote_average ?? 0,
  }
}

export default function SearchScreen() {
  const { isGoogleConnected, spreadsheetId, familyProfile } = useApp()
  const gdoc = useGdocService()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [responses, setResponses] = useState({})

  const sessionDate = useRef(new Date().toISOString())
  const subscribedServices = new Set(familyProfile.streamingServices ?? [])

  // Ensure the spreadsheet exists when the user first lands here
  useEffect(() => {
    if (isGoogleConnected && !spreadsheetId) {
      gdoc.findOrCreateSheet().catch(() => {})
    }
  }, [isGoogleConnected, spreadsheetId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search — fires 500 ms after the user stops typing
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchMovies(query)
        setResults((data.results ?? []).slice(0, 20))
      } catch {
        toast.error('Search failed — check your connection', { id: 'search-err' })
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  function handleResponse(movie, responseKey) {
    const previous = responses[movie.tmdb_id]
    if (previous === responseKey) return

    setResponses(prev => ({ ...prev, [movie.tmdb_id]: responseKey }))

    if (isGoogleConnected) {
      if (previous) {
        gdoc.updateResponse(movie.tmdb_id, responseKey)
      } else {
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

  return (
    <div className="flex flex-col" style={{ minHeight: '100%', background: 'var(--color-bg)' }}>
      {/* Sticky header + search input */}
      <div
        className="sticky top-0 px-6 pt-8 pb-4 z-10"
        style={{ background: 'var(--color-bg)' }}
      >
        <h1 className="text-xl font-bold text-white mb-4">Add to List</h1>
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <span className="text-slate-500">🔍</span>
          <input
            type="search"
            placeholder="Search for a movie…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm outline-none"
            autoComplete="off"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 text-lg leading-none">×</button>
          )}
        </div>
        {!isGoogleConnected && query && (
          <p className="text-xs text-slate-600 mt-2">
            Connect Google in Settings to save responses to your history.
          </p>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-6 pb-8">
        {/* Empty prompt */}
        {!query && (
          <div className="flex flex-col items-center justify-center min-h-64 gap-3 text-center">
            <div className="text-4xl">🎬</div>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              Search for any movie and mark it as Watched, Want to Watch, or Skip to add it to your history.
            </p>
          </div>
        )}

        {/* Searching spinner */}
        {searching && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        )}

        {/* No results */}
        {!searching && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-48 gap-3 text-center">
            <div className="text-4xl">🤷</div>
            <p className="text-slate-400 text-sm">No results for "{query}"</p>
          </div>
        )}

        {/* Results */}
        {!searching && results.length > 0 && (
          <div className="space-y-4">
            {results.map(tmdbMovie => {
              const movie = toMovieCardFormat(tmdbMovie)
              return (
                <MovieCard
                  key={movie.tmdb_id}
                  movie={movie}
                  response={responses[movie.tmdb_id]}
                  onResponse={key => handleResponse(movie, key)}
                  subscribedServices={subscribedServices}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
