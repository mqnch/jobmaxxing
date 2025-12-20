import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createJobHash } from '@/lib/utils'
import { parseJobsFromMarkdown } from '@/lib/parse-jobs'

const GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/master/README.md'

export async function POST(request: NextRequest) {
  try {
    const syncSecret = request.headers.get('x-sync-secret')
    if (!syncSecret || syncSecret !== process.env.SYNC_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const response = await fetch(GITHUB_RAW_URL)
    if (!response.ok) {
      throw new Error(`Failed to fetch markdown: ${response.statusText}`)
    }
    const markdown = await response.text()

    const parsedJobs = parseJobsFromMarkdown(markdown)
    const totalParsed = parsedJobs.length

    const supabase = createServiceClient()

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
        active: true,
        last_seen_at: now,
      })
    }

    let inserted = 0
    let updated = 0
    let batchErrors: any[] = []

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
            upsertError.message?.includes('is_trending')
          ) {
            console.error(
              'Database schema error detected. Missing columns: date_posted and/or is_trending'
            )
            console.error(
              'Please run the migration: supabase/migrations/add_job_columns.sql'
            )
            return NextResponse.json(
              {
                error: 'Database schema error',
                message:
                  'The jobs table is missing required columns (date_posted and/or is_trending).',
                details:
                  'Please run the migration file: supabase/migrations/add_job_columns.sql',
                migrationFile: 'supabase/migrations/add_job_columns.sql',
                sqlError: upsertError.message,
                code: upsertError.code,
              },
              { status: 500 }
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
      return NextResponse.json(
        {
          error: 'Failed to upsert jobs',
          message: 'All batches failed to upsert',
          batchErrors,
        },
        { status: 500 }
      )
    }

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

    return NextResponse.json({
      inserted,
      updated,
      deactivated,
      totalParsed,
      warnings:
        batchErrors.length > 0
          ? `${batchErrors.length} batch(es) had errors but processing continued`
          : undefined,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
