import { NextRequest, NextResponse } from 'next/server'
import { runSync } from '@/lib/sync'
import { getUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to sync the jobs database.' },
        { status: 401 }
      )
    }

    const stats = await runSync()
    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error('User-triggered sync error:', error)
    
    if (error instanceof Error && error.message.includes('Database schema error')) {
      return NextResponse.json(
        {
          error: 'Database schema error',
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
