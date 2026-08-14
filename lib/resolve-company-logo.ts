import { pickBestBrandMatch, type LogoBrandMatch } from '@/lib/logo-brand-match'
import { createServiceClient } from '@/lib/supabase/service'

const memoryCache = new Map<string, string | null>()
const STALE_MS = 30 * 24 * 60 * 60 * 1000

type SearchResult = {
  name?: string
  domain?: string
}

type CachedLogoRow = {
  company_key: string
  logo_url: string | null
  resolved_at: string
}

function imageLogoUrl(domain: string) {
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY || ''
  if (!token) return null

  const params = new URLSearchParams({
    token,
    size: '64',
    format: 'png',
    retina: 'true',
    fallback: '404',
  })

  return `https://img.logo.dev/${domain}?${params.toString()}`
}

async function searchBrands(query: string): Promise<LogoBrandMatch[]> {
  const secret = process.env.LOGO_DEV_SECRET_KEY
  if (!secret) return []

  const url = `https://api.logo.dev/search?${new URLSearchParams({
    q: query,
    strategy: 'match',
  }).toString()}`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  })

  if (!response.ok) return []

  const data = (await response.json()) as SearchResult[]
  if (!Array.isArray(data)) return []

  return data.flatMap((item) => {
    if (!item.name || !item.domain) return []
    return [{ name: item.name, domain: item.domain }]
  })
}

function isFresh(resolvedAt: string) {
  const resolved = Date.parse(resolvedAt)
  if (Number.isNaN(resolved)) return false
  return Date.now() - resolved < STALE_MS
}

async function readCachedLogos(keys: string[]): Promise<Map<string, string | null>> {
  const found = new Map<string, string | null>()
  if (keys.length === 0) return found

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('company_logos')
      .select('company_key, logo_url, resolved_at')
      .in('company_key', keys)

    if (error || !data) return found

    for (const row of data as CachedLogoRow[]) {
      if (!isFresh(row.resolved_at)) continue
      found.set(row.company_key, row.logo_url)
      memoryCache.set(row.company_key, row.logo_url)
    }
  } catch (error) {
    console.error('Error reading company logo cache:', error)
  }

  return found
}

async function writeCachedLogo(companyKey: string, logoUrl: string | null, domain: string | null) {
  memoryCache.set(companyKey, logoUrl)

  try {
    const supabase = createServiceClient()
    await supabase.from('company_logos').upsert(
      {
        company_key: companyKey,
        logo_url: logoUrl,
        domain,
        resolved_at: new Date().toISOString(),
      },
      { onConflict: 'company_key' }
    )
  } catch (error) {
    console.error('Error writing company logo cache:', error)
  }
}

export async function resolveCompanyLogoUrls(companies: string[]): Promise<Record<string, string | null>> {
  const unique: string[] = []
  const seen = new Set<string>()

  for (const company of companies) {
    const key = company.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(company.trim())
  }

  const logos: Record<string, string | null> = {}
  const missing: string[] = []

  for (const company of unique) {
    const key = company.toLowerCase()
    if (memoryCache.has(key)) {
      logos[key] = memoryCache.get(key) ?? null
    } else {
      missing.push(company)
    }
  }

  const dbHits = await readCachedLogos(
    missing.map((company) => company.toLowerCase()).filter((key) => !memoryCache.has(key))
  )

  const stillMissing: string[] = []
  for (const company of missing) {
    const key = company.toLowerCase()
    if (memoryCache.has(key)) {
      logos[key] = memoryCache.get(key) ?? null
    } else if (dbHits.has(key)) {
      logos[key] = dbHits.get(key) ?? null
    } else {
      stillMissing.push(company)
    }
  }

  const concurrency = 6
  for (let i = 0; i < stillMissing.length; i += concurrency) {
    const batch = stillMissing.slice(i, i + concurrency)
    await Promise.all(
      batch.map(async (company) => {
        const key = company.toLowerCase()
        const brands = await searchBrands(company)
        const best = pickBestBrandMatch(company, brands)
        const url = best ? imageLogoUrl(best.domain) : null
        logos[key] = url
        await writeCachedLogo(key, url, best?.domain ?? null)
      })
    )
  }

  return logos
}
