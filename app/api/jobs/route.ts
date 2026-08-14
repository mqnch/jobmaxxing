import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    const q = searchParams.get('q') || ''
    const activeParam = searchParams.get('active')
    const active = activeParam === null ? true : activeParam === 'true'
    const trendingParam = searchParams.get('trending')
    const trending = trendingParam === 'true'
    const seasonParam = searchParams.get('season')
    const season = seasonParam === 'winter' ? 'winter' : 'summer'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('jobs')
      .select('id, company, role, location, url, date_posted, created_at, is_trending, season, no_sponsorship, requires_us_citizenship, requires_advanced_degree')
      .eq('active', active)
      .eq('season', season)
      .order('date_posted', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1)

    if (trending) {
      query = query.eq('is_trending', true)
    }
    if (searchParams.get('advanced_degree') === 'true') {
      query = query.eq('requires_advanced_degree', true)
    }
    if (searchParams.get('no_sponsorship') === 'true') {
      query = query.eq('no_sponsorship', true)
    }
    if (searchParams.get('citizenship') === 'true') {
      query = query.eq('requires_us_citizenship', true)
    }

    if (q.trim()) {
      const searchTerm = q.trim()
      query = query.or(
        `company.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`
      )
    }

    let { data, error } = await query

    if (error && (error.message?.includes('column') || error.message?.includes('date_posted') || error.message?.includes('order') || error.code === 'PGRST116')) {
      console.warn('Some columns not found or order by failed, retrying with fallback:', error.message)
      let fallbackQuery = supabase
        .from('jobs')
        .select('id, company, role, location, url, created_at')
        .eq('active', active)
        .order('created_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: true })
        .range(offset, offset + limit - 1)

      if (q.trim()) {
        const searchTerm = q.trim()
        fallbackQuery = fallbackQuery.or(
          `company.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`
        )
      }

      const retryResult = await fallbackQuery
      error = retryResult.error
      
      if (retryResult.data) {
        data = retryResult.data.map((job: any) => ({
          ...job,
          date_posted: job.created_at || null,
          is_trending: false,
          no_sponsorship: false,
          requires_us_citizenship: false,
          requires_advanced_degree: false,
        })) as any
        
        if (trending && data) {
          data = data.filter((job: any) => job.is_trending === true)
        }
      } else {
        data = null
      }
    }

    if (error) {
      console.error('Error fetching jobs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
