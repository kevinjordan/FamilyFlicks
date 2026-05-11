import { createContext, useContext, useState, useEffect } from 'react'
import { isTokenExpired, refreshAccessToken } from '../services/authService'

const AppContext = createContext(null)

const STORAGE_KEYS = {
  ONBOARDING: 'onboardingComplete',
  FAMILY_PROFILE: 'familyProfile',
  GOOGLE_ACCESS_TOKEN: 'googleAccessToken',
  GOOGLE_REFRESH_TOKEN: 'googleRefreshToken',
  GOOGLE_EMAIL: 'googleUserEmail',
  GOOGLE_EXPIRES_AT: 'googleExpiresAt',
  SPREADSHEET_ID: 'spreadsheetId',
}

const DEFAULT_PROFILE = {
  siblingDefault: 'youngest',
  language: 'en',
  subtitles: false,
  includeAnimation: true,
  decadeFrom: 1990,
  streamingServices: [],
  children: [],
}

export function AppProvider({ children }) {
  const [onboardingComplete, setOnboardingComplete] = useState(
    () => localStorage.getItem(STORAGE_KEYS.ONBOARDING) === 'true'
  )
  const [familyProfile, setFamilyProfileState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAMILY_PROFILE)
      return stored ? JSON.parse(stored) : DEFAULT_PROFILE
    } catch {
      return DEFAULT_PROFILE
    }
  })
  const [googleAuth, setGoogleAuthState] = useState({
    accessToken: localStorage.getItem(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN),
    refreshToken: localStorage.getItem(STORAGE_KEYS.GOOGLE_REFRESH_TOKEN),
    email: localStorage.getItem(STORAGE_KEYS.GOOGLE_EMAIL),
    expiresAt: Number(localStorage.getItem(STORAGE_KEYS.GOOGLE_EXPIRES_AT)) || null,
  })
  const [spreadsheetId, setSpreadsheetIdState] = useState(
    localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID)
  )
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [authNeedsReconnect, setAuthNeedsReconnect] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  function completeOnboarding(profile) {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true')
    localStorage.setItem(STORAGE_KEYS.FAMILY_PROFILE, JSON.stringify(profile))
    setFamilyProfileState(profile)
    setOnboardingComplete(true)
  }

  function saveFamilyProfile(profile) {
    localStorage.setItem(STORAGE_KEYS.FAMILY_PROFILE, JSON.stringify(profile))
    setFamilyProfileState(profile)
  }

  function saveGoogleAuth({ accessToken, refreshToken, email, expiresAt }) {
    if (accessToken) localStorage.setItem(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN, accessToken)
    if (refreshToken) localStorage.setItem(STORAGE_KEYS.GOOGLE_REFRESH_TOKEN, refreshToken)
    if (email) localStorage.setItem(STORAGE_KEYS.GOOGLE_EMAIL, email)
    if (expiresAt) localStorage.setItem(STORAGE_KEYS.GOOGLE_EXPIRES_AT, String(expiresAt))
    setAuthNeedsReconnect(false)  // fresh tokens — clear any reconnect flag
    setGoogleAuthState({ accessToken, refreshToken, email, expiresAt: expiresAt ?? null })
  }

  function clearGoogleAuth() {
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_EMAIL)
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_EXPIRES_AT)
    setAuthNeedsReconnect(false)
    setGoogleAuthState({ accessToken: null, refreshToken: null, email: null, expiresAt: null })
  }

  // Used by gdocService before every Sheets API call.
  // Reads localStorage directly to avoid stale closure issues in async contexts.
  async function getValidAccessToken() {
    const expiresAt = Number(localStorage.getItem(STORAGE_KEYS.GOOGLE_EXPIRES_AT)) || null
    const accessToken = localStorage.getItem(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN)
    const refreshToken = localStorage.getItem(STORAGE_KEYS.GOOGLE_REFRESH_TOKEN)

    if (!isTokenExpired(expiresAt)) {
      setAuthNeedsReconnect(false)  // token is still valid — clear any stale flag
      return accessToken
    }

    if (!refreshToken) {
      setAuthNeedsReconnect(true)
      throw new Error('No refresh token — reconnect Google in Settings')
    }

    try {
      const refreshed = await refreshAccessToken(refreshToken)
      localStorage.setItem(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN, refreshed.accessToken)
      localStorage.setItem(STORAGE_KEYS.GOOGLE_EXPIRES_AT, String(refreshed.expiresAt))
      setGoogleAuthState(prev => ({ ...prev, accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt }))
      setAuthNeedsReconnect(false)
      return refreshed.accessToken
    } catch (err) {
      setAuthNeedsReconnect(true)   // refresh failed — prompt user to reconnect
      throw err
    }
  }

  function saveSpreadsheetId(id) {
    localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, id)
    setSpreadsheetIdState(id)
  }

  const isGoogleConnected = !!googleAuth.accessToken

  return (
    <AppContext.Provider value={{
      onboardingComplete,
      familyProfile,
      googleAuth,
      spreadsheetId,
      isOnline,
      isGoogleConnected,
      authNeedsReconnect,
      completeOnboarding,
      saveFamilyProfile,
      saveGoogleAuth,
      clearGoogleAuth,
      getValidAccessToken,
      saveSpreadsheetId,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

export { STORAGE_KEYS }
