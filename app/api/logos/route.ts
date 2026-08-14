import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyLogoUrls } from '@/lib/resolve-company-logo'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const companies = Array.isArray(body?.companies)
      ? body.companies.filter((name: unknown) => typeof name === 'string')
      : []

    if (companies.length === 0) {
      return NextResponse.json({ logos: {} })
    }

    const logos = await resolveCompanyLogoUrls(companies.slice(0, 150))
    return NextResponse.json({ logos })
  } catch (error) {
    console.error('Error resolving company logos:', error)
    return NextResponse.json({ logos: {} }, { status: 500 })
  }
}
