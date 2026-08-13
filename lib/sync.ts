import { createServiceClient } from '@/lib/supabase/service'
import { createJobHash } from '@/lib/utils'
import { parseJobsFromMarkdown } from '@/lib/parse-jobs'

const SUMMER_URL = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/README.md'
const OFF_SEASON_URL = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/README-Off-Season.md'

export interface SyncStats {
  inserted: number
  updated: number
  deactivated: number
  totalParsed: number
  warnings?: string
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

  const winterJobs = parseJobsFromMarkdown(offSeasonMarkdown)
    .filter((job) => job.terms.toLowerCase().includes('winter'))
    .map((job) => ({
      ...job,
      season: 'winter' as const,
    }))

  const parsedJobs = [...summerJobs, ...winterJobs]
  const totalParsed = parsedJobs.length

  const supabase = createServiceClient()

  // 4. Fetch existing job hashes
  const { data: existingJobs, error: fetchError } = await supabase
    .from('jobs')
    .select('hash')

  if (fetchError) {
    console.error('Error fetching existing jobs:', fetchError)
    throw fetchError
  }

  const existingHashes = new Set(
    (existingJobs || []).map((job: any) => job.hash)
  )

  const newHashes = new Set<string>()
  const jobsToUpsert: any[] = []
  const now = new Date().toISOString()

  for (const job of parsedJobs) {
    const hash = createJobHash(job.company, job.role, job.location, job.url)
    newHashes.add(hash)

    jobsToUpsert.push({
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
    })
  }

  let inserted = 0
  let updated = 0
  let batchErrors: any[] = []

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
  if (hashesToDeactivate.length > 0) {
    const { error: deactivateError } = await supabase
      .from('jobs')
      .update({ active: false })
      .in('hash', hashesToDeactivate)

    if (deactivateError) {
      console.error('Error deactivating jobs:', deactivateError)
    } else {
      deactivated = hashesToDeactivate.length
    }
  }

  return {
    inserted,
    updated,
    deactivated,
    totalParsed,
    warnings:
      batchErrors.length > 0
        ? `${batchErrors.length} batch(es) had errors but processing continued`
        : undefined,
  }
}
