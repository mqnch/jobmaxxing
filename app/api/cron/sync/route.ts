import { NextRequest, NextResponse } from 'next/server'
import { runSync } from '@/lib/sync'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const stats = await runSync()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Cron sync error:', error)
    
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
