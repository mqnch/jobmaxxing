import { getUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { job_id, saved, status } = body

    if (!job_id) {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: existingRecord } = await supabase
      .from('user_job')
      .select('status, applied_at')
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
    } = {
      user_id: user.id,
      job_id,
    }

    if (saved !== undefined) upsertData.saved = saved
    if (status !== undefined) {
      upsertData.status = status

      if (status === 'applied' && !existingRecord?.applied_at) {
        upsertData.applied_at = new Date().toISOString()
      }

      if (['interview', 'offer', 'rejected'].includes(status)) {
        upsertData.last_heard_at = new Date().toISOString()
      }
    }

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
    const { job_id, status, saved, notes } = body

    if (!job_id) {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: currentRecord } = await supabase
      .from('user_job')
      .select('status, applied_at')
      .eq('user_id', user.id)
      .eq('job_id', job_id)
      .single()

    const updateData: {
      status?: string
      saved?: boolean
      notes?: string
      applied_at?: string
      last_heard_at?: string
    } = {}
    if (status !== undefined) updateData.status = status
    if (saved !== undefined) updateData.saved = saved
    if (notes !== undefined) updateData.notes = notes

    if (status === 'applied' && !currentRecord?.applied_at) {
      updateData.applied_at = new Date().toISOString()
    }

    if (
      status &&
      ['interview', 'offer', 'rejected'].includes(status)
    ) {
      updateData.last_heard_at = new Date().toISOString()
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
