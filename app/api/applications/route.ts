import { getUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { termFromSeason } from '@/lib/terms'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_job')
      .select(
        `
        job_id,
        saved,
        status,
        notes,
        applied_at,
        last_heard_at,
        interview_rounds,
        term,
        jobs (
          id,
          company,
          role,
          location,
          url,
          season
        )
      `
      )
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching applications:', error)
      if (error.message?.includes('column') || error.code === 'PGRST116') {
        console.error('Database schema issue - missing columns:', error.message)
        return NextResponse.json(
          { 
            error: 'Database schema error',
            message: 'Some required columns may be missing. Please run the database migration.',
            details: error.message 
          },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { 
          error: 'Failed to fetch applications',
          message: error.message || 'Unknown error',
          code: error.code 
        },
        { status: 500 }
      )
    }

    const applications = (data || [])
      .map((item: any) => {
        const job = Array.isArray(item.jobs) ? item.jobs[0] : item.jobs
        if (!job) {
          console.warn(`Job ${item.job_id} not found in jobs table`)
          return null
        }
        return {
          job_id: item.job_id,
          company: job.company || '',
          role: job.role || '',
          location: job.location || '',
          url: job.url || '',
          saved: item.saved ?? false,
          status: item.status || 'not_applied',
          notes: item.notes || null,
          applied_at: item.applied_at || null,
          last_heard_at: item.last_heard_at || null,
          interview_rounds: item.interview_rounds ?? 0,
          term: item.term || termFromSeason(job.season),
        }
      })
      .filter((app: any) => app !== null)

    return NextResponse.json(applications)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
