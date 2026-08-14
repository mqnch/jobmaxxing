import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  title: 'Summer & Winter Internships',
  description:
    'Browse current summer and winter internship listings, filter by visa and citizenship, and track the ones you apply to.',
  path: '/jobs',
})

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children
}
