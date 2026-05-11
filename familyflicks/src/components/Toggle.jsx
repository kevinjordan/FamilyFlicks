export default function Toggle({ value, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative shrink-0 w-12 h-6 rounded-full transition-colors"
      style={{ background: value ? '#6366f1' : 'rgba(255,255,255,0.15)' }}
    >
      <div
        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
        style={{ transform: value ? 'translateX(28px)' : 'translateX(4px)' }}
      />
    </button>
  )
}
