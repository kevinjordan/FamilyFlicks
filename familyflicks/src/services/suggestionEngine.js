import { CERT_RANK, resolveCertCeiling } from '../constants/certs'

const MAX_GENRE_COUNT = 2  // max picks sharing the same genre label
const MAX_NUDGE       = 2  // max picks one cert above the ceiling

// ── Scoring ───────────────────────────────────────────────────────────────────

function computeScore(movie, userServices) {
  // Base score from TMDB community rating (0–10)
  const base = movie.vote_average ?? 0
  // Bonus for being on a service the family already subscribes to
  const streamBonus = (movie.streaming ?? []).some(s => userServices.has(s)) ? 1.5 : 0
  return base + streamBonus
}

// ── Selection ─────────────────────────────────────────────────────────────────

/**
 * Selects up to 10 movies from the candidate pool using rules-based scoring.
 *
 * Rules (in priority order):
 *   1. No movie above the cert ceiling is included — unless nudge is enabled,
 *      in which case up to MAX_NUDGE movies may be one cert above the ceiling.
 *   2. Movies with unknown / unrecognised certs are excluded (family safety).
 *   3. Genre variety: no more than MAX_GENRE_COUNT picks share the same genre label.
 *      When variety is exhausted the constraint is relaxed rather than stopping early.
 *   4. Score = vote_average + streaming bonus. Higher score wins tie-breaks.
 *
 * @param {object[]} candidates   - Enriched movie objects from tmdbService
 * @param {object}   familyProfile
 * @returns {object[]}            - Up to 10 movies, internal scoring fields stripped
 */
export function selectSuggestions(candidates, familyProfile, mode = 'children') {
  let certCeiling, nudgeEnabled
  if (mode === 'adults') {
    certCeiling  = '18'
    nudgeEnabled = false
  } else {
    const resolved = resolveCertCeiling(familyProfile)
    certCeiling  = resolved.certCeiling
    nudgeEnabled = resolved.nudgeEnabled
  }
  const ceilingRank  = CERT_RANK[certCeiling] ?? 1
  const userServices = new Set(familyProfile.streamingServices ?? [])

  // ── Tag and score ──────────────────────────────────────────────────────────

  const tagged = candidates
    .map(m => {
      const rank = CERT_RANK[m.cert]
      if (rank === undefined) return null          // Unknown cert — skip

      const isMain  = rank <= ceilingRank
      const isNudge = nudgeEnabled && rank === ceilingRank + 1

      if (!isMain && !isNudge) return null         // Too high even for nudge — skip

      return { ...m, _score: computeScore(m, userServices), _isNudge: !isMain }
    })
    .filter(Boolean)

  // Sort highest score first — the greedy loop below relies on this order
  tagged.sort((a, b) => b._score - a._score)

  // ── Greedy selection ───────────────────────────────────────────────────────

  const selected    = []
  const genreCounts = {}
  let   nudgeCount  = 0
  const remaining   = [...tagged]

  while (selected.length < 10 && remaining.length > 0) {
    let pickedIdx = -1

    // First pass: highest-scored movie that adds genre variety and fits nudge cap
    for (let i = 0; i < remaining.length; i++) {
      const m = remaining[i]
      if (m._isNudge && nudgeCount >= MAX_NUDGE) continue
      const addsVariety = (m.genres ?? []).some(g => (genreCounts[g] ?? 0) < MAX_GENRE_COUNT)
      if (addsVariety) { pickedIdx = i; break }
    }

    // Second pass (fallback): all genres saturated — take best that fits nudge cap
    if (pickedIdx === -1) {
      for (let i = 0; i < remaining.length; i++) {
        if (!remaining[i]._isNudge || nudgeCount < MAX_NUDGE) { pickedIdx = i; break }
      }
    }

    if (pickedIdx === -1) break   // No valid pick remains

    const [pick] = remaining.splice(pickedIdx, 1)
    if (pick._isNudge) nudgeCount++
    for (const g of pick.genres ?? []) genreCounts[g] = (genreCounts[g] ?? 0) + 1

    // Strip internal fields before adding to result
    const { _score, _isNudge, ...movie } = pick
    selected.push(movie)
  }

  return selected
}
