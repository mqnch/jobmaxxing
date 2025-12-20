export interface ParsedJob {
  company: string
  role: string
  location: string
  url: string
  description: string
  is_trending: boolean
  date_posted: string | null
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
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

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]

      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
      const cells: string[] = []
      let match

      while ((match = cellRegex.exec(row)) !== null) {
        cells.push(match[1])
      }

      if (cells.length < 4) {
        continue
      }

      const companyHtml = cells[0] || ''
      const roleHtml = cells[1] || ''
      const locationHtml = cells[2] || ''
      const applicationHtml = cells[3] || ''
      const ageHtml = cells[4] || ''
      const notesHtml = cells[5] || ''

      const is_trending = companyHtml.includes('🔥') || companyHtml.includes('🔥')

      let company = ''
      
      const linkMatch = companyHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/i)
      if (linkMatch) {
        const linkText = stripHtml(linkMatch[1])
        if (linkText && linkText.trim().length > 0 && !/^[\s\u2190-\u21FF\u2192]*$/.test(linkText)) {
          company = linkText.trim()
        }
      }
      
      if (!company || company.trim().length === 0) {
        const strongMatch = companyHtml.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i)
        if (strongMatch) {
          const strongText = stripHtml(strongMatch[1])
          if (strongText && strongText.trim().length > 0 && !/^[\s\u2190-\u21FF\u2192]*$/.test(strongText)) {
            company = strongText.trim()
          }
        }
      }
      
      if (!company || company.trim().length === 0) {
        const stripped = stripHtml(companyHtml)
        const cleaned = stripped.replace(/[\u2190-\u21FF\u2192\s]*/g, '').trim()
        if (cleaned && cleaned.length > 0) {
          company = cleaned
        }
      }

      const role = stripHtml(roleHtml)

      let location = stripHtml(locationHtml)
      
      if (location && location.length > 0) {
        const locationPattern = /([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(?:,\s*[A-Z][a-zA-Z\s]+)?)/g
        const matches = location.match(locationPattern)
        
        if (matches && matches.length > 1) {
          location = matches.join(', ')
        } else {
          const splitPattern = /([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(?:,\s*[A-Z][a-zA-Z\s]+)?)(?=[A-Z][a-z])/g
          const parts = location.split(splitPattern).filter(p => p.trim().length > 0)
          if (parts.length > 1) {
            location = parts.join(', ')
          }
        }
      }

      const url = extractUrl(applicationHtml)

      const ageStr = stripHtml(ageHtml)
      const date_posted = parseAgeToDate(ageStr)

      const description = stripHtml(notesHtml || '')

      if (!company || !role || !url) {
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
      })
    }
  }

  return jobs
}
