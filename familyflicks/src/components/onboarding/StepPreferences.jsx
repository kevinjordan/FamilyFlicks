import Toggle from '../Toggle'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: '',   label: 'Any language' },
  { code: 'ga', label: 'Irish' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
]

export default function StepPreferences({ language, subtitles, includeAnimation, onLanguage, onSubtitles, onAnimation }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Preferences</h2>
        <p className="text-slate-400 text-sm">These filter the movies we suggest for your family.</p>
      </div>

      {/* Language chips */}
      <div>
        <p className="text-slate-300 text-sm font-medium mb-3">Original language</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => {
            const selected = language === lang.code
            return (
              <button
                key={lang.code}
                onClick={() => onLanguage(lang.code)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  background: selected ? '#6366f1' : 'var(--color-surface)',
                  border: selected ? 'none' : '1px solid var(--color-border)',
                  color: selected ? 'white' : '#94a3b8',
                }}
              >
                {lang.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Subtitles */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div>
          <p className="text-white text-sm font-medium">Subtitles OK</p>
          <p className="text-slate-500 text-xs mt-1">Include foreign-language films with subtitles</p>
        </div>
        <Toggle value={subtitles} onChange={onSubtitles} />
      </div>

      {/* Animation */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div>
          <p className="text-white text-sm font-medium">Include animated films</p>
          <p className="text-slate-500 text-xs mt-1">Turn off to skip animated movies entirely</p>
        </div>
        <Toggle value={includeAnimation} onChange={onAnimation} />
      </div>
    </div>
  )
}
