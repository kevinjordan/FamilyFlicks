import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const tabs = [
  { to: '/list',     label: 'My List',     icon: '⭐' },
  { to: '/',         label: 'Suggestions', icon: '🎬', exact: true },
  { to: '/search',   label: 'Search',      icon: '🔍' },
  { to: '/settings', label: 'Settings',    icon: '⚙️' },
]

export default function Shell({ children }) {
  const { isOnline, authNeedsReconnect } = useApp()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full">
      {/* Auth-expired banner */}
      {authNeedsReconnect && (
        <button
          onClick={() => navigate('/settings')}
          className="w-full text-sm text-center py-2 px-4 transition-opacity hover:opacity-80"
          style={{
            background: 'rgba(239,68,68,0.12)',
            color: '#f87171',
            borderBottom: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          Google session expired — tap to reconnect ↗
        </button>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500/20 text-amber-300 text-sm text-center py-2 px-4 border-b border-amber-500/30">
          You're offline — showing cached content only
        </div>
      )}

      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Bottom tab nav */}
      <nav
        className="flex border-t border-white/8 bg-[#0f172a]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabs.map(({ to, label, icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs transition-colors ${
                isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <span className="text-xl leading-none">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
