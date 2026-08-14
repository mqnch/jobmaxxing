export const LOCATION_JOIN = ' — '

const COUNTRY_NAMES = [
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Netherlands',
  'Switzerland',
  'Singapore',
  'Australia',
  'Germany',
  'Ireland',
  'Canada',
  'France',
  'Mexico',
  'Japan',
  'India',
  'China',
  'USA',
  'UAE',
  'CAN',
  'UK',
]

const STATE_NAMES = [
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'West Virginia',
  'District of Columbia',
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'Wisconsin',
  'Wyoming',
]

const CITY_WORD = '(?:Mc[A-Z][a-z]+|Mac[A-Z][a-z]+|Ste?\\.?|[A-Z][a-z][A-Z][a-z]+|[A-Z][a-z]+)'
const CITY = `${CITY_WORD}(?:[\\s'-]${CITY_WORD})*`
const COUNTRY_ALT = COUNTRY_NAMES.join('|')
const PLACE_ALT = [...COUNTRY_NAMES, ...STATE_NAMES].join('|')
const BOUNDARY = '(?=[A-Z]|$|,|\\s)'

const LOCATION_PATTERNS: RegExp[] = [
  new RegExp(`^Remote in (?:United States|Canada|USA|CAN|[A-Z]{2})${BOUNDARY}`),
  new RegExp(`^${CITY},\\s*[A-Z]{2},\\s*(?:${COUNTRY_ALT})`),
  new RegExp(`^${CITY},\\s*(?:${COUNTRY_ALT})`),
  new RegExp(`^${CITY},\\s*[A-Z]{2}`),
  new RegExp(`^${CITY}\\s+-\\s+(?:${COUNTRY_ALT})`),
  new RegExp(`^(?:NYC|USA|UAE|SFO|LAX|SF|LA|DC|HK|UK)${BOUNDARY}`),
  new RegExp(`^(?:${PLACE_ALT})${BOUNDARY}`),
]

function matchAt(input: string, index: number): string | null {
  const slice = input.slice(index)
  for (const pattern of LOCATION_PATTERNS) {
    const match = slice.match(pattern)
    if (match?.[0]) return match[0]
  }
  return null
}

export function splitConcatenatedLocations(location: string): string[] {
  if (!location || !location.trim()) return []

  if (/\s+[—–]\s+/.test(location)) {
    return location
      .split(/\s+[—–]\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
  }

  const input = location.replace(/^\d+\s+locations?/i, '').trim()
  const parts: string[] = []
  let index = 0

  const skipSeparators = () => {
    while (index < input.length && /[\s,]/.test(input[index])) index++
  }

  while (index < input.length) {
    skipSeparators()
    if (index >= input.length) break

    const match = matchAt(input, index)
    if (match) {
      parts.push(match.trim())
      index += match.length
      continue
    }

    let found: { start: number; text: string } | null = null
    for (let cursor = index + 1; cursor < input.length; cursor++) {
      const next = matchAt(input, cursor)
      if (next) {
        found = { start: cursor, text: next }
        break
      }
    }

    if (found) {
      const leftover = input.slice(index, found.start).replace(/[,\s]+$/g, '').trim()
      if (leftover) parts.push(leftover)
      parts.push(found.text.trim())
      index = found.start + found.text.length
    } else {
      const leftover = input.slice(index).trim()
      if (leftover) parts.push(leftover)
      break
    }
  }

  return parts
}

export function formatJobLocation(location: string): string {
  return splitConcatenatedLocations(location).join(LOCATION_JOIN)
}
