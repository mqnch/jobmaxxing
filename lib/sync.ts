import { createServiceClient } from '@/lib/supabase/service'
import { createJobHash } from '@/lib/utils'
import { isArrowCompanyName, parseJobsFromMarkdown } from '@/lib/parse-jobs'

const SUMMER_URL = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/README.md'
const OFF_SEASON_URL = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/README-Off-Season.md'
const INACTIVE_URL = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/README-Inactive.md'

export interface SyncStats {
  inserted: number
  updated: number
  deactivated: number
  rematched: number
  totalParsed: number
  warnings?: string
}

function cleanCompanyName(company: string): string {
  return (company || '').replace(/🔥/g, '').trim()
}

function normalizeJobUrl(url: string): string {
  return (url || '').trim().toLowerCase()
}

function jobUrlKeys(url: string): string[] {
  const normalized = normalizeJobUrl(url)
  const keys = normalized ? [normalized] : []
  try {
    const parsed = new URL(normalized)
    keys.push(`${parsed.origin}${parsed.pathname}`.toLowerCase())
  } catch {
    // keep the raw key only
  }
  return keys
}

function normalizeRoleKey(role: string): string {
  return role
    .replace(/\s*\((?:Summer|Winter|Spring|Fall|Autumn)\s+\d{4}(?:,\s*(?:Summer|Winter|Spring|Fall|Autumn)\s+\d{4})*\)\s*$/i, '')
    .replace(/[🛂🇺🇸🎓🔥🔒]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function normalizeLocationKey(location: string): string {
  return (location || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function jobIdentityKey(company: string, role: string, url: string): string {
  return `${cleanCompanyName(company).toLowerCase()}|${normalizeRoleKey(role)}|${normalizeJobUrl(url)}`
}

function hostKey(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
    const firstPath = parsed.pathname.split('/').filter(Boolean)[0]?.toLowerCase()
    if (host === 'boards.greenhouse.io' || host === 'job-boards.greenhouse.io') {
      return firstPath ? `greenhouse:${firstPath}` : null
    }
    if (host === 'jobs.lever.co') {
      return firstPath ? `lever:${firstPath}` : null
    }
    if (host === 'simplify.jobs') return null
    return host
  } catch {
    return null
  }
}

function addCompanyLookups(
  job: { company: string; role: string; location: string; url: string },
  companyByUrl: Map<string, string>,
  companyByRoleLocation: Map<string, string>,
  companyByRole: Map<string, string>,
  hostCounts: Map<string, Map<string, number>>,
  ambiguousRoles: Set<string>
) {
  const company = cleanCompanyName(job.company)
  if (!company || isArrowCompanyName(company)) return

  for (const key of jobUrlKeys(job.url)) {
    companyByUrl.set(key, company)
  }

  const roleKey = normalizeRoleKey(job.role)
  if (roleKey) {
    const roleLocationKey = `${roleKey}|${normalizeLocationKey(job.location)}`
    companyByRoleLocation.set(roleLocationKey, company)
    const existingRole = companyByRole.get(roleKey)
    if (existingRole && existingRole !== company) {
      ambiguousRoles.add(roleKey)
    } else {
      companyByRole.set(roleKey, company)
    }
  }

  const host = hostKey(job.url)
  if (host) {
    if (!hostCounts.has(host)) hostCounts.set(host, new Map())
    const counts = hostCounts.get(host)!
    counts.set(company, (counts.get(company) || 0) + 1)
  }
}

function majorityCompany(counts: Map<string, number> | undefined): string | undefined {
  if (!counts || counts.size === 0) return undefined
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
  if (ranked.length === 1) return ranked[0][0]
  if (ranked[0][1] >= ranked[1][1] * 3) return ranked[0][0]
  return undefined
}

async function fetchAllJobs<T extends Record<string, unknown>>(
  supabase: ReturnType<typeof createServiceClient>,
  columns: string
): Promise<T[]> {
  const pageSize = 1000
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('jobs')
      .select(columns)
      .range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...((data || []) as T[]))
    if (!data || data.length < pageSize) break
  }
  return rows
}

async function parseListings(url: string): Promise<ReturnType<typeof parseJobsFromMarkdown>> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.statusText}`)
      return []
    }
    return parseJobsFromMarkdown(await response.text())
  } catch (error) {
    console.warn(`Failed to fetch ${url}:`, error)
    return []
  }
}

async function rematchArrowCompanyJobs(
  supabase: ReturnType<typeof createServiceClient>,
  liveJobs: { company: string; role: string; location: string; url: string }[]
): Promise<number> {
  const extraJobs = (await Promise.all([parseListings(INACTIVE_URL)])).flat()

  const companyByUrl = new Map<string, string>()
  const companyByRoleLocation = new Map<string, string>()
  const companyByRole = new Map<string, string>()
  const hostCounts = new Map<string, Map<string, number>>()
  const ambiguousRoles = new Set<string>()

  const add = (job: { company: string; role: string; location: string; url: string }) =>
    addCompanyLookups(
      job,
      companyByUrl,
      companyByRoleLocation,
      companyByRole,
      hostCounts,
      ambiguousRoles
    )

  let existing: {
    id: string
    hash: string
    company: string
    url: string
    role: string
    location: string
  }[]
  try {
    existing = await fetchAllJobs(supabase, 'id, hash, company, url, role, location')
  } catch (error) {
    console.error('Error fetching jobs for arrow rematch:', error)
    return 0
  }

  for (const job of existing) {
    add(job)
  }
  for (const job of [...extraJobs, ...liveJobs]) {
    add(job)
  }
  for (const key of ambiguousRoles) {
    companyByRole.delete(key)
  }

  const arrowJobs = existing.filter((job) => isArrowCompanyName(job.company || ''))
  let rematched = 0

  const resolveCompany = (job: { url: string; role: string; location: string }) => {
    for (const key of jobUrlKeys(job.url)) {
      const company = companyByUrl.get(key)
      if (company) return company
    }
    const roleKey = normalizeRoleKey(job.role)
    const roleLocationKey = `${roleKey}|${normalizeLocationKey(job.location)}`
    const host = hostKey(job.url)
    return (
      companyByRoleLocation.get(roleLocationKey) ||
      companyByRole.get(roleKey) ||
      majorityCompany(host ? hostCounts.get(host) : undefined)
    )
  }

  const updateOne = async (job: {
    id: string
    hash: string
    company: string
    url: string
    role: string
    location: string
  }) => {
    const company = resolveCompany(job)
    if (!company) return

    const hash = createJobHash(company, job.role, job.location, job.url)
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ company, hash })
      .eq('id', job.id)

    if (!updateError) {
      rematched++
      return
    }

    if (updateError.code !== '23505') {
      console.error(`Error rematching arrow job ${job.id}:`, updateError)
      return
    }

    const { data: canonical } = await supabase
      .from('jobs')
      .select('id')
      .eq('hash', hash)
      .neq('id', job.id)
      .maybeSingle()

    if (!canonical?.id) return

    const { error: moveError } = await supabase
      .from('user_job')
      .update({ job_id: canonical.id })
      .eq('job_id', job.id)

    if (moveError) {
      await supabase.from('user_job').delete().eq('job_id', job.id)
    }

    const { error: deleteError } = await supabase.from('jobs').delete().eq('id', job.id)
    if (deleteError) {
      console.error(`Error deleting duplicate arrow job ${job.id}:`, deleteError)
      return
    }
    rematched++
  }

  const batchSize = 25
  for (let i = 0; i < arrowJobs.length; i += batchSize) {
    await Promise.all(arrowJobs.slice(i, i + batchSize).map(updateOne))
  }

  return rematched
}

export async function runSync(): Promise<SyncStats> {
  // 1. Fetch Summer internships
  const summerResponse = await fetch(SUMMER_URL)
  if (!summerResponse.ok) {
    throw new Error(`Failed to fetch Summer markdown: ${summerResponse.statusText}`)
  }
  const summerMarkdown = await summerResponse.text()

  // 2. Fetch Off-Season internships (Fall/Winter/Spring) — we only keep Winter postings from this file
  const offSeasonResponse = await fetch(OFF_SEASON_URL)
  if (!offSeasonResponse.ok) {
    throw new Error(`Failed to fetch Off-Season markdown: ${offSeasonResponse.statusText}`)
  }
  const offSeasonMarkdown = await offSeasonResponse.text()

  // 3. Parse jobs from both markdowns and tag each with a season
  const summerJobs = parseJobsFromMarkdown(summerMarkdown).map((job) => ({
    ...job,
    season: 'summer' as const,
  }))

  const offSeasonParsed = parseJobsFromMarkdown(offSeasonMarkdown)
  const winterJobs = offSeasonParsed
    .filter((job) => job.terms.toLowerCase().includes('winter'))
    .map((job) => ({
      ...job,
      season: 'winter' as const,
    }))

  const parsedJobs = [...summerJobs, ...winterJobs]
  const totalParsed = parsedJobs.filter((job) => job.url).length

  const supabase = createServiceClient()
  const rematched = await rematchArrowCompanyJobs(supabase, [...summerJobs, ...offSeasonParsed])

  // 4. Fetch existing jobs so location/hash changes update in place
  let existingJobs: {
    id: string
    hash: string
    company: string
    role: string
    url: string
    active: boolean
  }[]
  try {
    existingJobs = await fetchAllJobs(supabase, 'id, hash, company, role, url, active')
  } catch (fetchError) {
    console.error('Error fetching existing jobs:', fetchError)
    throw fetchError
  }

  const existingHashes = new Set(existingJobs.map((job) => job.hash))
  const existingByIdentity = new Map<string, { id: string; hash: string; active: boolean }>()
  for (const job of existingJobs) {
    const key = jobIdentityKey(job.company, job.role, job.url)
    const prev = existingByIdentity.get(key)
    if (!prev || (!prev.active && job.active)) {
      existingByIdentity.set(key, { id: job.id, hash: job.hash, active: job.active })
    }
  }

  const newHashes = new Set<string>()
  const jobsToUpsert: Record<string, unknown>[] = []
  const jobsToRelocate: { id: string; payload: Record<string, unknown> }[] = []
  const now = new Date().toISOString()
  const claimedIds = new Set<string>()

  for (const job of parsedJobs) {
    if (!job.url) continue

    const hash = createJobHash(job.company, job.role, job.location, job.url)
    newHashes.add(hash)

    const payload = {
      hash,
      company: job.company,
      role: job.role,
      location: job.location,
      url: job.url,
      description: job.description,
      is_trending: job.is_trending || false,
      date_posted: job.date_posted || null,
      season: job.season,
      no_sponsorship: job.no_sponsorship || false,
      requires_us_citizenship: job.requires_us_citizenship || false,
      requires_advanced_degree: job.requires_advanced_degree || false,
      active: true,
      last_seen_at: now,
    }

    const identity = jobIdentityKey(job.company, job.role, job.url)
    const existing = existingByIdentity.get(identity)
    if (existing && existing.hash !== hash && !claimedIds.has(existing.id)) {
      jobsToRelocate.push({ id: existing.id, payload })
      claimedIds.add(existing.id)
      continue
    }

    jobsToUpsert.push(payload)
  }

  let inserted = 0
  let updated = 0
  let batchErrors: any[] = []

  const relocateOne = async (row: { id: string; payload: Record<string, unknown> }) => {
    const { error: updateError } = await supabase
      .from('jobs')
      .update(row.payload)
      .eq('id', row.id)

    if (!updateError) {
      updated++
      return
    }

    if (updateError.code !== '23505') {
      console.error(`Error updating location for job ${row.id}:`, updateError)
      jobsToUpsert.push(row.payload)
      return
    }

    const { data: canonical } = await supabase
      .from('jobs')
      .select('id')
      .eq('hash', row.payload.hash)
      .neq('id', row.id)
      .maybeSingle()

    if (!canonical?.id) {
      jobsToUpsert.push(row.payload)
      return
    }

    const { error: moveError } = await supabase
      .from('user_job')
      .update({ job_id: canonical.id })
      .eq('job_id', row.id)

    if (moveError) {
      await supabase.from('user_job').delete().eq('job_id', row.id)
    }

    const { error: deleteError } = await supabase.from('jobs').delete().eq('id', row.id)
    if (deleteError) {
      console.error(`Error removing duplicate job ${row.id}:`, deleteError)
      return
    }

    const { error: canonicalError } = await supabase
      .from('jobs')
      .update(row.payload)
      .eq('id', canonical.id)

    if (canonicalError) {
      console.error(`Error updating canonical job ${canonical.id}:`, canonicalError)
      return
    }
    updated++
  }

  const relocateBatchSize = 25
  for (let i = 0; i < jobsToRelocate.length; i += relocateBatchSize) {
    await Promise.all(jobsToRelocate.slice(i, i + relocateBatchSize).map(relocateOne))
  }

  // 5. Upsert jobs in batches
  if (jobsToUpsert.length > 0) {
    const batchSize = 1000
    for (let i = 0; i < jobsToUpsert.length; i += batchSize) {
      const batch = jobsToUpsert.slice(i, i + batchSize)
      const { data, error: upsertError } = await supabase
        .from('jobs')
        .upsert(batch, {
          onConflict: 'hash',
        })
        .select('hash')

      if (upsertError) {
        console.error(`Error upserting batch ${i}:`, upsertError)
        batchErrors.push({
          batch: i,
          error: upsertError.message || 'Unknown error',
          code: upsertError.code,
        })

        if (
          upsertError.message?.includes('column') ||
          upsertError.code === 'PGRST116' ||
          upsertError.message?.includes('date_posted') ||
          upsertError.message?.includes('is_trending') ||
          upsertError.message?.includes('season') ||
          upsertError.message?.includes('sponsorship') ||
          upsertError.message?.includes('citizenship') ||
          upsertError.message?.includes('degree')
        ) {
          console.error(
            'Database schema error detected. Missing columns: date_posted, is_trending, season, no_sponsorship, requires_us_citizenship, and/or requires_advanced_degree'
          )
          console.error(
            'Please run the migrations: supabase/migrations/add_job_columns.sql, supabase/migrations/add_job_season.sql, and supabase/migrations/add_job_flags.sql'
          )
          throw new Error(
            `Database schema error: ${upsertError.message}. Please run migration files: supabase/migrations/add_job_columns.sql, supabase/migrations/add_job_season.sql, and supabase/migrations/add_job_flags.sql`
          )
        }

        continue
      }

      const returnedHashes = new Set((data || []).map((j: any) => j.hash))
      batch.forEach((job) => {
        if (existingHashes.has(job.hash)) {
          updated++
        } else {
          inserted++
        }
      })
    }
  }

  if (batchErrors.length > 0 && inserted === 0 && updated === 0) {
    throw new Error(
      `Failed to upsert jobs: All batches failed. Errors: ${JSON.stringify(batchErrors)}`
    )
  }

  // 6. Deactivate jobs no longer in the sources
  const hashesToDeactivate = Array.from(existingHashes).filter(
    (hash) => !newHashes.has(hash)
  )

  let deactivated = 0
  const deactivateBatchSize = 100
  for (let i = 0; i < hashesToDeactivate.length; i += deactivateBatchSize) {
    const chunk = hashesToDeactivate.slice(i, i + deactivateBatchSize)
    const { error: deactivateError } = await supabase
      .from('jobs')
      .update({ active: false })
      .in('hash', chunk)

    if (deactivateError) {
      console.error('Error deactivating jobs:', deactivateError)
    } else {
      deactivated += chunk.length
    }
  }

  return {
    inserted,
    updated,
    deactivated,
    rematched,
    totalParsed,
    warnings:
      batchErrors.length > 0
        ? `${batchErrors.length} batch(es) had errors but processing continued`
        : undefined,
  }
}
