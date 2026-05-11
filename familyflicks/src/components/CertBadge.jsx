import { CERT_COLORS } from '../constants/certs'

export default function CertBadge({ cert, size = 'sm' }) {
  if (!cert || !CERT_COLORS[cert]) return null

  return (
    <span
      className="rounded font-bold leading-none shrink-0"
      style={{
        background: CERT_COLORS[cert],
        color: 'white',
        fontSize: size === 'sm' ? 10 : 12,
        padding: size === 'sm' ? '2px 5px' : '3px 7px',
      }}
    >
      {cert}
    </span>
  )
}
