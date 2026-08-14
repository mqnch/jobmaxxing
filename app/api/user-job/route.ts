import { getUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { clampInterviewRounds, roundsForStatus, statusForRounds, termFromSeason } from '@/lib/terms'
import { NextRequest, NextResponse } from 'next/server'

async function resolveTerm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  existingTerm?: string | null
) {
  if (existingTerm) return existingTerm
  const { data: job } = await supabase
    .from('jobs')
    .select('season')
    .eq('id', jobId)
    .maybeSingle()
  return termFromSeason(job?.season)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { job_id, saved, status, interview_rounds } = body

    if (!job_id) {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: existingRecord } = await supabase
      .from('user_job')
      .select('status, applied_at, interview_rounds, term')
      .eq('user_id', user.id)
      .eq('job_id', job_id)
      .maybeSingle()

    const upsertData: {
      user_id: string
      job_id: string
      saved?: boolean
      status?: string
      applied_at?: string
      last_heard_at?: string
      interview_rounds?: number
      term?: string
    } = {
      user_id: user.id,
      job_id,
    }

    const currentStatus = existingRecord?.status || 'not_applied'
    const currentRounds = existingRecord?.interview_rounds ?? 0

    if (saved !== undefined) upsertData.saved = saved
    if (status !== undefined) {
      upsertData.status = status
    } else if (saved === true && currentStatus === 'not_applied') {
      upsertData.status = 'applied'
    }

    let nextStatus = upsertData.status ?? currentStatus
    if (interview_rounds !== undefined) {
      const rounds = clampInterviewRounds(interview_rounds)
      nextStatus = statusForRounds(nextStatus, rounds)
      upsertData.status = nextStatus
      upsertData.interview_rounds = rounds
    } else {
      upsertData.interview_rounds = roundsForStatus(nextStatus, currentRounds)
    }

    if (currentStatus === 'not_applied' && nextStatus !== 'not_applied') {
      upsertData.saved = true
    }

    if (nextStatus === 'applied' && !existingRecord?.applied_at) {
      upsertData.applied_at = new Date().toISOString()
    }

    if (['interview', 'offer', 'rejected'].includes(nextStatus) && nextStatus !== currentStatus) {
      upsertData.last_heard_at = new Date().toISOString()
    }

    upsertData.term = await resolveTerm(supabase, job_id, existingRecord?.term)

    const { data, error } = await supabase
      .from('user_job')
      .upsert(upsertData, {
        onConflict: 'user_id,job_id',
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting user_job:', error)
      return NextResponse.json(
        { error: 'Failed to save job' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { job_id, status, saved, notes, interview_rounds, term } = body

    if (!job_id) {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: currentRecord } = await supabase
      .from('user_job')
      .select('status, applied_at, interview_rounds, term')
      .eq('user_id', user.id)
      .eq('job_id', job_id)
      .single()

    const updateData: {
      status?: string
      saved?: boolean
      notes?: string
      applied_at?: string
      last_heard_at?: string
      interview_rounds?: number
      term?: string
    } = {}
    if (status !== undefined) updateData.status = status
    if (saved !== undefined) updateData.saved = saved
    if (notes !== undefined) updateData.notes = notes
    if (term !== undefined) updateData.term = term

    const currentStatus = currentRecord?.status || 'not_applied'
    const currentRounds = currentRecord?.interview_rounds ?? 0
    let nextStatus = status ?? currentStatus

    if (saved === true && status === undefined && currentStatus === 'not_applied') {
      nextStatus = 'applied'
      updateData.status = 'applied'
    }

    if (interview_rounds !== undefined) {
      const rounds = clampInterviewRounds(interview_rounds)
      nextStatus = statusForRounds(nextStatus, rounds)
      updateData.status = nextStatus
      updateData.interview_rounds = rounds
    } else {
      updateData.interview_rounds = roundsForStatus(nextStatus, currentRounds)
      if (status !== undefined) updateData.status = status
    }

    if (currentStatus === 'not_applied' && nextStatus !== 'not_applied') {
      updateData.saved = true
    }

    if (nextStatus === 'applied' && !currentRecord?.applied_at) {
      updateData.applied_at = new Date().toISOString()
    }

    if (
      ['interview', 'offer', 'rejected'].includes(nextStatus) &&
      nextStatus !== currentStatus
    ) {
      updateData.last_heard_at = new Date().toISOString()
    }

    if (!currentRecord?.term && !updateData.term) {
      updateData.term = await resolveTerm(supabase, job_id, currentRecord?.term)
    }

    const { data, error } = await supabase
      .from('user_job')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('job_id', job_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user_job:', error)
      return NextResponse.json(
        { error: 'Failed to update job' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { job_id } = body

    if (!job_id) {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('user_job')
      .delete()
      .eq('user_id', user.id)
      .eq('job_id', job_id)

    if (error) {
      console.error('Error deleting user_job:', error)
      return NextResponse.json(
        { error: 'Failed to delete job' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
