const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

// Derive redirect URI dynamically so it works in both dev and prod without extra config.
// The registered URI in Google Cloud Console must match this exactly.
function getRedirectUri() {
  return `${window.location.origin}/auth/callback`
}

// ── PKCE helpers ────────────────────────────────────────────────────────────

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => chars[b % chars.length]).join('')
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const hashed = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(hashed)
}

// ── OAuth initiation ─────────────────────────────────────────────────────────

export async function initiateGoogleOAuth() {
  const codeVerifier = generateRandomString(64)
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = generateRandomString(32)

  sessionStorage.setItem('pkce_verifier', codeVerifier)
  sessionStorage.setItem('pkce_state', state)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'offline',  // request a refresh token
    prompt: 'consent',        // ensures refresh_token is always returned
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ── Token exchange ───────────────────────────────────────────────────────────

export async function exchangeCodeForTokens(code, receivedState) {
  const codeVerifier = sessionStorage.getItem('pkce_verifier')
  const expectedState = sessionStorage.getItem('pkce_state')

  sessionStorage.removeItem('pkce_verifier')
  sessionStorage.removeItem('pkce_state')

  if (!codeVerifier || receivedState !== expectedState) {
    throw new Error('OAuth state mismatch — possible CSRF. Please try connecting again.')
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: getRedirectUri(),
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
  })

  // client_secret is optional — required if using "Web application" client type in Google Cloud.
  // Omit if using "Desktop app" client type (recommended for public clients).
  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET
  if (clientSecret) params.set('client_secret', clientSecret)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error_description ?? `Token exchange failed (${res.status})`)
  }

  const data = await res.json()

  // Extract email from the id_token JWT payload (display-only, not used as identifier)
  let email = null
  if (data.id_token) {
    try {
      const payload = JSON.parse(atob(data.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      email = payload.email ?? null
    } catch {
      // non-critical — email is display-only
    }
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    email,
  }
}

// ── Token refresh ────────────────────────────────────────────────────────────

export async function refreshAccessToken(refreshToken) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET
  if (clientSecret) params.set('client_secret', clientSecret)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error_description ?? `Token refresh failed (${res.status})`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }
}

// ── Token expiry check ───────────────────────────────────────────────────────

// Treats the token as expired 5 minutes before actual expiry to avoid edge cases.
export function isTokenExpired(expiresAt) {
  return !expiresAt || Date.now() > expiresAt - 5 * 60 * 1000
}
