import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { exchangeCodeForTokens } from '../services/authService'

export default function AuthCallbackScreen() {
  const { saveGoogleAuth } = useApp()
  const [status, setStatus] = useState('processing') // 'processing' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const error = params.get('error')

    if (error) {
      setStatus('error')
      setErrorMsg(
        error === 'access_denied'
          ? 'Google sign-in was cancelled.'
          : `Google returned an error: ${error}`
      )
      return
    }

    if (!code) {
      setStatus('error')
      setErrorMsg('No authorisation code received from Google.')
      return
    }

    exchangeCodeForTokens(code, state)
      .then(({ accessToken, refreshToken, expiresAt, email }) => {
        saveGoogleAuth({ accessToken, refreshToken, expiresAt, email })
        setStatus('success')
        setTimeout(() => window.location.replace('/#/settings'), 1200)
      })
      .catch(err => {
        setStatus('error')
        setErrorMsg(err.message)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4"
           style={{ background: 'var(--color-bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm">Connecting to Google…</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3"
           style={{ background: 'var(--color-bg)' }}>
        <div className="text-5xl">✅</div>
        <p className="text-white text-lg font-semibold">Connected!</p>
        <p className="text-slate-400 text-sm">Taking you back to Settings…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 text-center"
         style={{ background: 'var(--color-bg)' }}>
      <div className="text-5xl">⚠️</div>
      <p className="text-white text-lg font-semibold">Sign-in failed</p>
      <p className="text-slate-400 text-sm max-w-xs">{errorMsg}</p>
      <button
        onClick={() => window.location.replace('/#/settings')}
        className="mt-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
      >
        Back to Settings
      </button>
    </div>
  )
}
