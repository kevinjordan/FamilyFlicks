import toast from 'react-hot-toast'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const SPREADSHEET_NAME = 'FamilyFlicks_Data'
const SUGGESTIONS_HEADERS = [
  'tmdb_id', 'title', 'cert', 'genre', 'release_year',
  'response', 'rating', 'session_date',
]

// ── Generic HTTP helper ──────────────────────────────────────────────────────

async function apiRequest(getToken, { base = SHEETS_BASE, method = 'GET', path, params = {}, body = null }) {
  const token = await getToken()

  // Build URL by string concatenation — avoids URL() re-encoding sheet range chars (! :)
  let url = `${base}${path}`
  const qs = new URLSearchParams(params).toString()
  if (qs) url += `?${qs}`

  const opts = { method, headers: { Authorization: `Bearer ${token}` } }
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(url, opts)
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    const err = new Error(errData.error?.message ?? `API error ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// ── Retry on 429 / 503 (one retry, 1.2 s delay) ─────────────────────────────

async function withRetry(fn) {
  try {
    return await fn()
  } catch (err) {
    if (err.status === 429 || err.status === 503) {
      await new Promise(r => setTimeout(r, 1200))
      return fn()
    }
    throw err
  }
}

// ── Internal: ensure suggestions sheet has its header row ────────────────────

async function ensureHeaders(getToken, spreadsheetId) {
  const data = await apiRequest(getToken, {
    path: `/${spreadsheetId}/values/suggestions!A1`,
  })
  if (!data.values) {
    await apiRequest(getToken, {
      method: 'POST',
      path: `/${spreadsheetId}/values/suggestions!A1:H1:append`,
      params: { valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' },
      body: { values: [SUGGESTIONS_HEADERS] },
    })
  }
}

// ── findOrCreateSheet ────────────────────────────────────────────────────────
// Returns the spreadsheet ID, creating the sheet if needed.
// Drive files.list is not used — drive.file scope does not permit corpus
// searches; the spreadsheet ID is persisted in localStorage instead.

export async function findOrCreateSheet(getToken, storedId, saveId) {
  // 1. Verify the stored ID is still accessible
  if (storedId) {
    try {
      await apiRequest(getToken, {
        path: `/${storedId}`,
        params: { fields: 'spreadsheetId' },
      })
      await ensureHeaders(getToken, storedId)
      return storedId
    } catch (err) {
      if (err.status !== 404 && err.status !== 403) throw err
      // File deleted or unshared — fall through to create a new one
    }
  }

  // 2. Create a new spreadsheet with both sheets in one call
  const created = await apiRequest(getToken, {
    method: 'POST',
    path: '',
    body: {
      properties: { title: SPREADSHEET_NAME },
      sheets: [
        { properties: { title: 'suggestions', index: 0 } },
        { properties: { title: 'settings',    index: 1 } },
      ],
    },
  })

  const id = created.spreadsheetId
  saveId(id)

  await apiRequest(getToken, {
    method: 'POST',
    path: `/${id}/values/suggestions!A1:H1:append`,
    params: { valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' },
    body: { values: [SUGGESTIONS_HEADERS] },
  })

  return id
}

// ── readSuggestions ──────────────────────────────────────────────────────────

export async function readSuggestions(getToken, spreadsheetId) {
  const data = await apiRequest(getToken, {
    path: `/${spreadsheetId}/values/suggestions!A:H`,
  })

  const rows = data.values ?? []
  if (rows.length <= 1) return [] // empty or header-only

  return rows.slice(1).map(row => ({
    tmdb_id:      Number(row[0]),
    title:        row[1] ?? '',
    cert:         row[2] ?? '',
    genre:        row[3] ?? '',
    release_year: Number(row[4]) || null,
    response:     row[5] ?? '',
    rating:       row[6] ? Number(row[6]) : null,
    session_date: row[7] ?? '',
  }))
}

// ── writeSuggestion — fire-and-forget ────────────────────────────────────────

export function writeSuggestion(getToken, spreadsheetId, record) {
  const row = [
    record.tmdb_id,
    record.title,
    record.cert ?? '',
    Array.isArray(record.genres) ? record.genres.join('|') : (record.genre ?? ''),
    record.release_year ?? '',
    record.response,
    '', // rating — written separately when the user rates
    record.session_date ?? new Date().toISOString(),
  ]

  withRetry(() =>
    apiRequest(getToken, {
      method: 'POST',
      path: `/${spreadsheetId}/values/suggestions!A:H:append`,
      params: { valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' },
      body: { values: [row] },
    })
  ).catch(() =>
    toast.error('Failed to save response — check your connection', { id: 'write-error' })
  )
}

// ── updateResponse — fire-and-forget ─────────────────────────────────────────

export function updateResponse(getToken, spreadsheetId, tmdbId, response) {
  withRetry(async () => {
    const colData = await apiRequest(getToken, {
      path: `/${spreadsheetId}/values/suggestions!A:A`,
    })
    const rows = colData.values ?? []
    const idx = rows.findIndex((r, i) => i > 0 && Number(r[0]) === tmdbId)
    if (idx < 1) return

    await apiRequest(getToken, {
      method: 'PUT',
      path: `/${spreadsheetId}/values/suggestions!F${idx + 1}`,
      params: { valueInputOption: 'RAW' },
      body: { values: [[response]] },
    })
  }).catch(() =>
    toast.error('Failed to update response', { id: 'update-error' })
  )
}

// ── writeRating — fire-and-forget ─────────────────────────────────────────────

export function writeRating(getToken, spreadsheetId, tmdbId, rating) {
  withRetry(async () => {
    // Read column A to find the row index of this tmdb_id
    const colData = await apiRequest(getToken, {
      path: `/${spreadsheetId}/values/suggestions!A:A`,
    })
    const rows = colData.values ?? []

    // rows[0] = header; data starts at rows[1] → sheet row 2
    // findIndex returns 0-based array index; sheet row = index + 1
    const idx = rows.findIndex((r, i) => i > 0 && Number(r[0]) === tmdbId)
    if (idx < 1) return // not found

    await apiRequest(getToken, {
      method: 'PUT',
      path: `/${spreadsheetId}/values/suggestions!G${idx + 1}`,
      params: { valueInputOption: 'RAW' },
      body: { values: [[rating]] },
    })
  }).catch(() =>
    toast.error('Failed to save rating — check your connection', { id: 'rating-error' })
  )
}

// ── readSettings ──────────────────────────────────────────────────────────────

export async function readSettings(getToken, spreadsheetId) {
  try {
    const data = await apiRequest(getToken, {
      path: `/${spreadsheetId}/values/settings!A1`,
    })
    const raw = data.values?.[0]?.[0]
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// ── writeSettings — fire-and-forget ──────────────────────────────────────────

export function writeSettings(getToken, spreadsheetId, profile) {
  withRetry(() =>
    apiRequest(getToken, {
      method: 'PUT',
      path: `/${spreadsheetId}/values/settings!A1`,
      params: { valueInputOption: 'RAW' },
      body: { values: [[JSON.stringify(profile)]] },
    })
  ).catch(() =>
    toast.error('Settings saved locally — Google sync failed', { id: 'settings-error' })
  )
}
