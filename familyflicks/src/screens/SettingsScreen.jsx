import { useState } from 'react'
import toast from 'react-hot-toast'
import { useApp } from '../context/AppContext'
import { initiateGoogleOAuth } from '../services/authService'
import { useGdocService } from '../hooks/useGdocService'
import Toggle from '../components/Toggle'
import StepSiblingDefault from '../components/onboarding/StepSiblingDefault'
import StepPreferences from '../components/onboarding/StepPreferences'
import StepDecade from '../components/onboarding/StepDecade'
import StepStreaming from '../components/onboarding/StepStreaming'
import { CERTS, CERT_COLORS } from '../constants/certs'

function ChildCard({ index, value, onChange, onRemove, canRemove }) {
  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-white text-sm font-semibold">Child {index + 1}</p>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-xs font-medium px-2.5 py-1 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
          >
            Remove
          </button>
        )}
      </div>

      <div>
        <p className="text-slate-500 text-xs mb-2">Maximum certificate</p>
        <div className="grid grid-cols-4 gap-2">
          {CERTS.map(cert => {
            const selected = value.maxCert === cert
            return (
              <button
                key={cert}
                onClick={() => onChange({ ...value, maxCert: cert })}
                className="py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: selected ? CERT_COLORS[cert] : 'var(--color-surface-raised)',
                  border: selected ? 'none' : '1px solid var(--color-border)',
                  color: selected ? 'white' : '#94a3b8',
                }}
              >
                {cert}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-white text-sm">Suggest slightly older movies sometimes?</p>
          <p className="text-slate-500 text-xs mt-0.5">Up to 2 picks rated one cert above their limit</p>
        </div>
        <Toggle
          value={value.nudgeEnabled}
          onChange={nudgeEnabled => onChange({ ...value, nudgeEnabled })}
        />
      </div>
    </div>
  )
}

export default function SettingsScreen() {
  const {
    familyProfile,
    saveFamilyProfile,
    googleAuth,
    clearGoogleAuth,
    isGoogleConnected,
    authNeedsReconnect,
    spreadsheetId,
  } = useApp()
  const gdoc = useGdocService()

  const [children, setChildren] = useState(familyProfile.children ?? [])
  const [siblingDefault, setSiblingDefault] = useState(familyProfile.siblingDefault ?? 'youngest')
  const [language, setLanguage] = useState(familyProfile.language ?? 'en')
  const [subtitles, setSubtitles] = useState(familyProfile.subtitles ?? false)
  const [includeAnimation, setIncludeAnimation] = useState(familyProfile.includeAnimation ?? true)
  const [decadeFrom, setDecadeFrom] = useState(familyProfile.decadeFrom ?? 1990)
  const [streamingServices, setStreamingServices] = useState(familyProfile.streamingServices ?? [])

  function addChild() {
    if (children.length >= 6) return
    setChildren(prev => [
      ...prev,
      { id: `child_${prev.length + 1}`, maxCert: 'PG', nudgeEnabled: false },
    ])
  }

  function removeLastChild() {
    if (children.length <= 1) return
    setChildren(prev => prev.slice(0, -1))
  }

  function updateChild(i, data) {
    setChildren(prev => prev.map((c, idx) => (idx === i ? data : c)))
  }

  function handleSave() {
    const profile = {
      siblingDefault: children.length === 1 ? 'youngest' : siblingDefault,
      language,
      subtitles,
      includeAnimation,
      decadeFrom,
      streamingServices,
      children,
    }
    saveFamilyProfile(profile)
    if (isGoogleConnected && spreadsheetId) gdoc.writeSettings(profile)
    toast.success('Settings saved — takes effect on your next session')
  }

  function handleSignOut() {
    clearGoogleAuth()
    toast.success('Signed out of Google')
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '100%', background: 'var(--color-bg)' }}>
      {/* Scrollable content */}
      <div className="flex-1 px-6 pt-10 pb-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <span className="text-slate-600 text-xs">{__BUILD_DATE__}</span>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          Changes take effect on your next suggestion session.
        </p>

        <div className="mt-8 space-y-10">
          {/* Children */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Children</h2>
            {children.map((child, i) => (
              <ChildCard
                key={child.id}
                index={i}
                value={child}
                onChange={data => updateChild(i, data)}
                onRemove={removeLastChild}
                canRemove={i === children.length - 1 && children.length > 1}
              />
            ))}
            {children.length < 6 && (
              <button
                onClick={addChild}
                className="w-full py-3 rounded-2xl text-sm font-medium"
                style={{
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px dashed rgba(99,102,241,0.4)',
                  color: '#a5b4fc',
                }}
              >
                + Add a child
              </button>
            )}
          </section>

          {/* Sibling default — only shown when 2+ children */}
          {children.length > 1 && (
            <section>
              <StepSiblingDefault value={siblingDefault} onChange={setSiblingDefault} />
            </section>
          )}

          {/* Preferences */}
          <section>
            <StepPreferences
              language={language}
              subtitles={subtitles}
              includeAnimation={includeAnimation}
              onLanguage={setLanguage}
              onSubtitles={setSubtitles}
              onAnimation={setIncludeAnimation}
            />
          </section>

          {/* Decade */}
          <section>
            <StepDecade value={decadeFrom} onChange={setDecadeFrom} />
          </section>

          {/* Streaming services */}
          <section>
            <StepStreaming value={streamingServices} onChange={setStreamingServices} />
          </section>

          {/* Google account */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Google Account</h2>
            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              {isGoogleConnected && authNeedsReconnect ? (
                /* Token refresh failed — prompt reconnect without losing email */
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: '#f87171' }}>Session expired</p>
                    <p className="text-slate-400 text-xs mt-0.5 truncate">{googleAuth.email}</p>
                  </div>
                  <button
                    className="shrink-0 text-sm font-medium px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                    onClick={initiateGoogleOAuth}
                  >
                    Reconnect
                  </button>
                </div>
              ) : isGoogleConnected ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">Connected</p>
                    <p className="text-slate-400 text-xs mt-0.5 truncate">{googleAuth.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="shrink-0 text-sm font-medium px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white text-sm font-medium">Not connected</p>
                    <p className="text-slate-400 text-xs mt-0.5">Sign in to sync your list across devices</p>
                  </div>
                  <button
                    className="shrink-0 text-sm font-medium px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}
                    onClick={initiateGoogleOAuth}
                  >
                    Connect
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Save button — sticky to the bottom of the scroll container */}
      <div
        className="sticky bottom-0 px-6 py-4"
        style={{
          background: 'linear-gradient(to top, var(--color-bg) 65%, transparent)',
        }}
      >
        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-opacity hover:opacity-90 active:opacity-75"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}
