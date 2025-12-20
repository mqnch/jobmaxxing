import { createHash } from 'crypto'

export function createJobHash(
  company: string,
  role: string,
  location: string,
  url: string
): string {
  const normalized = [
    company.toLowerCase().trim(),
    role.toLowerCase().trim(),
    location.toLowerCase().trim(),
    url.toLowerCase().trim(),
  ].join('|')

  return createHash('sha256').update(normalized).digest('hex')
}
