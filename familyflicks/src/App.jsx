import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Shell from './components/Shell'
import SuggestionsScreen from './screens/SuggestionsScreen'
import MyListScreen from './screens/MyListScreen'
import SettingsScreen from './screens/SettingsScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import AuthCallbackScreen from './screens/AuthCallbackScreen'
import SearchScreen from './screens/SearchScreen'
import ErrorBoundary from './components/ErrorBoundary'
import { AppProvider, useApp } from './context/AppContext'

// Intercepts Google's redirect to /auth/callback before HashRouter takes over.
// HashRouter only reads the hash, so window.location.pathname is still '/auth/callback'
// when the page reloads after OAuth.
function OAuthGate({ children }) {
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallbackScreen />
  }
  return children
}

function Router() {
  const { onboardingComplete } = useApp()

  if (!onboardingComplete) {
    return <OnboardingScreen />
  }

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<SuggestionsScreen />} />
        <Route path="/list" element={<MyListScreen />} />
        <Route path="/search" element={<SearchScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/list" replace />} />
      </Routes>
    </Shell>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <HashRouter>
          <OAuthGate>
            <Router />
          </OAuthGate>
          <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
          />
        </HashRouter>
      </AppProvider>
    </ErrorBoundary>
  )
}
