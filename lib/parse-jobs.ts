import { LOCATION_JOIN, formatJobLocation } from './locations'

export interface ParsedJob {
  company: string
  role: string
  location: string
  url: string
  description: string
  is_trending: boolean
  date_posted: string | null
  terms: string
  no_sponsorship: boolean
  requires_us_citizenship: boolean
  requires_advanced_degree: boolean
}

const ARROW_ONLY_RE = /^[\s\u2190-\u21FF\u2900-\u297F🔥]*$/

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .trim()
}

export function isArrowCompanyName(company: string): boolean {
  const trimmed = company.trim()
  return trimmed.length > 0 && ARROW_ONLY_RE.test(trimmed)
}

function extractCompanyName(companyHtml: string): string {
  const linkMatch = companyHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/i)
  if (linkMatch) {
    const linkText = stripHtml(linkMatch[1]).replace(/🔥/g, '').trim()
    if (linkText && !ARROW_ONLY_RE.test(linkText)) {
      return linkText
    }
  }

  const strongMatch = companyHtml.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i)
  if (strongMatch) {
    const strongText = stripHtml(strongMatch[1]).replace(/🔥/g, '').trim()
    if (strongText && !ARROW_ONLY_RE.test(strongText)) {
      return strongText
    }
  }

  const stripped = stripHtml(companyHtml)
  const cleaned = stripped.replace(/[\u2190-\u21FF\u2900-\u297F🔥\s]/g, '').trim()
  return cleaned
}

function extractUrl(html: string): string {
  const hrefMatch = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/i)
  if (hrefMatch) {
    return hrefMatch[1].trim()
  }

  const urlMatch = html.match(/https?:\/\/[^\s<>"']+/i)
  if (urlMatch) {
    return urlMatch[0].trim()
  }

  return ''
}

function parseLocationHtml(locationHtml: string): string {
  if (!locationHtml || !locationHtml.trim()) {
    return ''
  }

  let html = locationHtml
  const detailsMatch = html.match(/<details\b[^>]*>[\s\S]*?<\/details>/i)
  if (detailsMatch) {
    html = detailsMatch[0]
      .replace(/<summary\b[^>]*>[\s\S]*?<\/summary>/i, '')
      .replace(/<\/?details\b[^>]*>/gi, '')
  }

  return formatJobLocation(
    stripHtml(html.replace(/<br\s*\/?>/gi, '\n'))
      .split(/\n+/)
      .map((part) => part.replace(/\s+/g, ' ').trim())
      .filter((part) => part.length > 0 && !/^\d+\s+locations?$/i.test(part))
      .join(LOCATION_JOIN)
  )
}

function parseAgeToDate(ageStr: string): string | null {
  if (!ageStr || !ageStr.trim()) {
    return null
  }

  const age = ageStr.trim().toLowerCase()
  const now = new Date()
  
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

  const dayMatch = age.match(/^(\d+)d$/)
  const weekMatch = age.match(/^(\d+)w$/)
  const monthMatch = age.match(/^(\d+)mo$/)

  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10)
    const date = new Date(startOfToday)
    date.setDate(date.getDate() - days)
    date.setHours(0, 0, 0, 0)
    return date.toISOString()
  } else if (weekMatch) {
    const weeks = parseInt(weekMatch[1], 10)
    const date = new Date(startOfToday)
    date.setDate(date.getDate() - weeks * 7)
    date.setHours(0, 0, 0, 0)
    return date.toISOString()
  } else if (monthMatch) {
    const months = parseInt(monthMatch[1], 10)
    const date = new Date(startOfToday)
    date.setMonth(date.getMonth() - months)
    date.setHours(0, 0, 0, 0)
    return date.toISOString()
  }

  return null
}

export function parseJobsFromMarkdown(markdown: string): ParsedJob[] {
  const jobs: ParsedJob[] = []

  const tableRegex = /<table>[\s\S]*?<\/table>/gi
  const tables = markdown.match(tableRegex) || []

  for (const tableHtml of tables) {
    if (
      !tableHtml.includes('<th>Company</th>') &&
      !tableHtml.includes('<th>Role</th>')
    ) {
      continue
    }

    const rowRegex = /<tr>[\s\S]*?<\/tr>/gi
    const rows = tableHtml.match(rowRegex) || []

    if (rows.length < 2) {
      continue
    }

    const headerRow = rows[0] || ''
    const headerCellRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi
    const headers: string[] = []
    let headerMatch

    while ((headerMatch = headerCellRegex.exec(headerRow)) !== null) {
      headers.push(stripHtml(headerMatch[1]).trim())
    }

    const companyIndex = headers.findIndex(h => h.toLowerCase() === 'company')
    const roleIndex = headers.findIndex(h => h.toLowerCase() === 'role')
    const locationIndex = headers.findIndex(h => h.toLowerCase() === 'location')
    const applicationIndex = headers.findIndex(h => h.toLowerCase() === 'application')
    const ageIndex = headers.findIndex(h => h.toLowerCase() === 'age')
    const termsIndex = headers.findIndex(h => h.toLowerCase() === 'terms')
    const notesIndex = headers.findIndex(h => h.toLowerCase().includes('note'))

    const compIdx = companyIndex !== -1 ? companyIndex : 0
    const roleIdx = roleIndex !== -1 ? roleIndex : 1
    const locIdx = locationIndex !== -1 ? locationIndex : 2
    const appIdx = applicationIndex !== -1 ? applicationIndex : 3
    const ageIdx = ageIndex !== -1 ? ageIndex : 4
    const notesIdx = notesIndex !== -1 ? notesIndex : 5
    const termsIdx = termsIndex !== -1 ? termsIndex : -1

    let lastCompany = ''
    let lastTrending = false

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]

      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
      const cells: string[] = []
      let match

      while ((match = cellRegex.exec(row)) !== null) {
        cells.push(match[1])
      }

      const maxIdx = Math.max(compIdx, roleIdx, locIdx, appIdx, ageIdx, notesIdx, termsIdx)
      if (cells.length <= maxIdx && cells.length < 4) {
        continue
      }

      const companyHtml = cells[compIdx] || ''
      const roleHtml = cells[roleIdx] || ''
      const locationHtml = locIdx !== -1 ? (cells[locIdx] || '') : ''
      const applicationHtml = cells[appIdx] || ''
      const ageHtml = ageIdx !== -1 ? (cells[ageIdx] || '') : ''
      const notesHtml = notesIdx !== -1 ? (cells[notesIdx] || '') : ''
      const termsHtml = termsIdx !== -1 ? (cells[termsIdx] || '') : ''

      const rowTrending = companyHtml.includes('🔥')
      let company = extractCompanyName(companyHtml)
      const isContinuation =
        !company && isArrowCompanyName(stripHtml(companyHtml)) && !!lastCompany

      if (isContinuation) {
        company = lastCompany
      }

      const is_trending = isContinuation ? lastTrending || rowTrending : rowTrending

      if (company && !isArrowCompanyName(company)) {
        lastCompany = company
        lastTrending = is_trending
      }

      const no_sponsorship = roleHtml.includes('🛂')
      const requires_us_citizenship = roleHtml.includes('🇺🇸')
      const requires_advanced_degree = roleHtml.includes('🎓')

      let role = stripHtml(roleHtml)
        .replace(/🛂|🇺🇸|🎓/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      const terms = termsHtml ? stripHtml(termsHtml).trim() : ''
      if (terms) {
        role = `${role} (${terms})`
      }

      const location = parseLocationHtml(locationHtml)

      const url = extractUrl(applicationHtml)

      const ageStr = stripHtml(ageHtml)
      const date_posted = parseAgeToDate(ageStr)

      const description = stripHtml(notesHtml || '')

      if (!company || !role) {
        continue
      }

      jobs.push({
        company,
        role,
        location,
        url,
        description,
        is_trending,
        date_posted,
        terms,
        no_sponsorship,
        requires_us_citizenship,
        requires_advanced_degree,
      })
    }
  }

  return jobs
}
