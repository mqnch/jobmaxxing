export type LogoBrandMatch = {
  name: string
  domain: string
}

const STOPWORDS = new Set([
  'inc',
  'llc',
  'ltd',
  'corp',
  'corporation',
  'company',
  'the',
  'of',
  'and',
  'group',
  'holdings',
  'plc',
  'co',
])

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function significantTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
}

function tokenCoverage(tokens: string[], name: string, domain: string): number {
  const haystack = `${name} ${domain}`.toLowerCase()
  const hayCompact = compact(haystack)
  let hits = 0
  for (const token of tokens) {
    if (haystack.includes(token) || hayCompact.includes(token)) hits += 1
  }
  return hits
}

function tldBonus(tld: string) {
  switch (tld) {
    case 'com':
      return 28
    case 'io':
    case 'ai':
    case 'space':
    case 'aero':
      return 18
    case 'co':
      return 8
    case 'org':
      return -8
    case 'net':
      return -22
    case 'info':
    case 'xyz':
    case 'online':
    case 'shop':
    case 'store':
      return -30
    default:
      return 0
  }
}

export function scoreBrandMatch(query: string, brand: LogoBrandMatch): number {
  const q = query.trim().toLowerCase()
  const qCompact = compact(q)
  const tokens = significantTokens(q)
  if (!q || !qCompact) return -Infinity

  const name = brand.name.trim().toLowerCase()
  const domain = brand.domain.trim().toLowerCase().replace(/^www\./, '')
  const [sld = '', ...tldParts] = domain.split('.')
  const tld = tldParts.join('.')
  const coverage = tokenCoverage(tokens, name, domain)

  if (tokens.length >= 2 && coverage < 2) return -Infinity

  let score = coverage * 22

  if (name === q) score += 36
  else if (name.startsWith(`${q} `) || name.startsWith(`${q},`)) score += 28
  else if (name.includes(q)) score += 8

  if (sld === qCompact) score += 48
  else if (tokens.length === 1 && sld === tokens[0]) score += 48
  else if (sld.startsWith(qCompact)) score += 12

  score += tldBonus(tld)

  return score
}

export function pickBestBrandMatch(query: string, brands: LogoBrandMatch[]): LogoBrandMatch | null {
  if (brands.length === 0) return null

  let best: LogoBrandMatch | null = null
  let bestScore = -Infinity

  for (const brand of brands) {
    const score = scoreBrandMatch(query, brand)
    if (score > bestScore) {
      best = brand
      bestScore = score
    }
  }

  return bestScore > 0 ? best : null
}
