export const CERTS = ['G', 'PG', '12A', '15A']

export const CERT_COLORS = {
  G: '#16a34a',
  PG: '#d97706',
  '12A': '#ea580c',
  '15A': '#dc2626',
}

// Numeric rank used for cert ceiling comparisons and nudge logic
export const CERT_RANK = { G: 0, PG: 1, '12A': 2, '15A': 3 }

// Returns the cert one level above the given cert, or null if already at the top.
export function certOneAbove(cert) {
  const idx = CERTS.indexOf(cert)
  return idx >= 0 && idx < CERTS.length - 1 ? CERTS[idx + 1] : null
}

// Derives the effective cert ceiling and whether nudge is active from a family profile.
export function resolveCertCeiling(familyProfile) {
  const { children = [], siblingDefault = 'youngest' } = familyProfile
  const ranked = children.map(c => c.maxCert).filter(c => CERT_RANK[c] !== undefined)
  if (!ranked.length) return { certCeiling: 'PG', nudgeEnabled: false }

  const certCeiling = siblingDefault === 'youngest'
    ? ranked.reduce((min, c) => CERT_RANK[c] < CERT_RANK[min] ? c : min)
    : ranked.reduce((max, c) => CERT_RANK[c] > CERT_RANK[max] ? c : max)

  const nudgeEnabled = children.some(c => c.nudgeEnabled)
  return { certCeiling, nudgeEnabled }
}
