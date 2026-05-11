import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 text-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="text-5xl">💥</div>
        <div className="space-y-2">
          <h2 className="text-white font-semibold">Something went wrong</h2>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            FamilyFlicks hit an unexpected error. Tap below to reload the app.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 rounded-2xl font-semibold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          Reload app
        </button>

        {/* Error detail — dev only */}
        {import.meta.env.DEV && this.state.error && (
          <details className="text-left w-full max-w-sm mt-2">
            <summary className="text-slate-500 text-xs cursor-pointer select-none">
              Error details (dev only)
            </summary>
            <pre className="text-red-400 text-xs mt-2 whitespace-pre-wrap overflow-auto max-h-48 p-3 rounded-xl"
                 style={{ background: 'rgba(239,68,68,0.08)' }}>
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          </details>
        )}
      </div>
    )
  }
}
