import { CERTS, CERT_RANK, certOneAbove, resolveCertCeiling } from '../constants/certs'
import { STREAMING_SERVICES } from '../constants/streamingServices'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'

// ── Genre ID → name map ───────────────────────────────────────────────────────

export const GENRE_NAMES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
}

// Build a reverse map from TMDB provider_id → our service id
const TMDB_ID_TO_SERVICE = Object.fromEntries(
  STREAMING_SERVICES.map(s => [s.tmdbId, s.id])
)

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function tmdbGet(path, params = {}) {
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set('api_key', import.meta.env.VITE_TMDB_API_KEY)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url)
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    const err = new Error(errData.status_message ?? `TMDB error ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// ── Cert helpers ──────────────────────────────────────────────────────────────

// BBFC (GB) cert → approximate Irish equivalent
const GB_TO_IE = { U: 'G', PG: 'PG', '12': '12A', '12A': '12A', '15': '15A', '15A': '15A' }

function extractCert(releaseDates) {
  const results = releaseDates?.results ?? []

  for (const country of ['IE', 'GB']) {
    const entry = results.find(r => r.iso_3166_1 === country)
    // prefer theatrical release (type 3), fall back to any type
    const certEntry = entry?.release_dates?.find(d => d.certification && d.type === 3)
      ?? entry?.release_dates?.find(d => d.certification)
    if (!certEntry) continue

    const raw = certEntry.certification.trim()
    if (country === 'IE') return raw
    return GB_TO_IE[raw] ?? ''
  }

  return ''
}

// ── Streaming helpers ─────────────────────────────────────────────────────────

function extractStreaming(watchProviders) {
  const ie = watchProviders?.results?.IE
  if (!ie) return []

  const providers = [...(ie.flatrate ?? []), ...(ie.free ?? [])]

  return providers
    .map(p => TMDB_ID_TO_SERVICE[p.provider_id] ?? null)
    .filter(Boolean)
    .filter((id, i, arr) => arr.indexOf(id) === i) // deduplicate
}

// ── Discover ──────────────────────────────────────────────────────────────────

function buildDiscoverParams(familyProfile, certCeiling) {
  const { language, includeAnimation, decadeFrom } = familyProfile

  const params = {
    sort_by: 'vote_average.desc',
    'vote_count.gte': 200,
    certification_country: 'IE',
    'certification.lte': certCeiling,
    'primary_release_date.gte': `${decadeFrom ?? 1990}-01-01`,
  }

  if (language) params.with_original_language = language
  if (includeAnimation === false) params.without_genres = '16'

  return params
}

// Fetches one discover page. Never throws — returns empty results on failure.
async function fetchDiscoverPage(params, page) {
  try {
    return await tmdbGet('/discover/movie', { ...params, page })
  } catch {
    return { results: [], total_pages: 0 }
  }
}

// ── Movie detail (cert + streaming in one call) ───────────────────────────────

// Fetches full detail for one movie. Never throws — falls back to basic data.
async function fetchMovieDetails(movie) {
  try {
    const detail = await tmdbGet(`/movie/${movie.id}`, {
      append_to_response: 'release_dates,watch/providers',
      language: 'en-US',
    })

    return {
      tmdb_id:       movie.id,
      title:         movie.title,
      genres:        (movie.genre_ids ?? []).map(id => GENRE_NAMES[id]).filter(Boolean),
      release_year:  movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
      language:      movie.original_language,
      poster_url:    movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null,
      overview:      detail.overview ?? movie.overview ?? '',
      cert:          extractCert(detail.release_dates),
      streaming:     extractStreaming(detail['watch/providers']),
      vote_average:  detail.vote_average ?? movie.vote_average ?? 0,
    }
  } catch {
    // Return basic data with empty cert/streaming rather than dropping the movie entirely
    return {
      tmdb_id:       movie.id,
      title:         movie.title,
      genres:        (movie.genre_ids ?? []).map(id => GENRE_NAMES[id]).filter(Boolean),
      release_year:  movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
      language:      movie.original_language,
      poster_url:    movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null,
      overview:      movie.overview ?? '',
      cert:          '',
      streaming:     [],
      vote_average:  movie.vote_average ?? 0,
    }
  }
}

// Batches detail fetches to stay inside TMDB's 40 req / 10 s rate limit.
// Batch size 10, 400 ms between batches → ≤ 10 req / 400 ms = 25 req/s max.
async function fetchDetailsInBatches(movies, batchSize = 10, delayMs = 400) {
  const results = []
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(fetchMovieDetails))
    results.push(...batchResults)
    if (i + batchSize < movies.length) {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
  return results
}

// ── fetchCandidates — main export ─────────────────────────────────────────────

/**
 * Fetches up to ~60 movie candidates matching the family profile,
 * excluding any IDs already in the suggestion history.
 *
 * @param {object} familyProfile
 * @param {number[]} excludeIds  - TMDB IDs already responded to
 * @returns {Promise<object[]>}  - Array of candidate movie objects
 */
export async function fetchCandidates(familyProfile, excludeIds = []) {
  const excludeSet = new Set(excludeIds)
  const { certCeiling, nudgeEnabled } = resolveCertCeiling(familyProfile)

  // If any child has nudge enabled, widen the TMDB query by one cert level
  // so the suggestion engine has nudge candidates to choose from.
  const queryCeiling = nudgeEnabled
    ? (certOneAbove(certCeiling) ?? certCeiling)
    : certCeiling

  const discoverParams = buildDiscoverParams(familyProfile, queryCeiling)

  // Fetch pages 1–3 in parallel
  const pages = await Promise.all([1, 2, 3].map(page =>
    fetchDiscoverPage(discoverParams, page)
  ))

  let raw = pages.flatMap(p => p.results ?? [])

  // If fewer than 20 non-excluded movies remain, top up with pages 4–5
  const afterExclusion = raw.filter(m => !excludeSet.has(m.id))
  if (afterExclusion.length < 20) {
    const extraPages = await Promise.all([4, 5].map(page =>
      fetchDiscoverPage(discoverParams, page)
    ))
    raw = [...raw, ...extraPages.flatMap(p => p.results ?? [])]
  }

  // Deduplicate by ID, then apply exclusion list
  const seen = new Set()
  const candidates = raw.filter(m => {
    if (seen.has(m.id) || excludeSet.has(m.id)) return false
    seen.add(m.id)
    return true
  })

  // Fetch cert + streaming in batches
  return fetchDetailsInBatches(candidates)
}

// ── fetchPosterPaths — used by My List screen ─────────────────────────────────
// Returns { [tmdbId]: posterUrl | null } using the smaller w185 image size.
// Each call only needs the base /movie/{id} endpoint (no append_to_response).

export async function fetchPosterPaths(tmdbIds, batchSize = 10) {
  const result = {}
  for (let i = 0; i < tmdbIds.length; i += batchSize) {
    const batch = tmdbIds.slice(i, i + batchSize)
    await Promise.all(batch.map(async id => {
      try {
        const data = await tmdbGet(`/movie/${id}`)
        result[id] = data.poster_path
          ? `https://image.tmdb.org/t/p/w185${data.poster_path}`
          : null
      } catch {
        result[id] = null
      }
    }))
    if (i + batchSize < tmdbIds.length) {
      await new Promise(r => setTimeout(r, 250))
    }
  }
  return result
}

// ── searchMovies — used by Search screen ──────────────────────────────────────

export async function searchMovies(query, page = 1) {
  return tmdbGet('/search/movie', {
    query,
    language: 'en-US',
    page,
    include_adult: 'false',
  })
}
