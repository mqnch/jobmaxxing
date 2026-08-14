import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  title: 'My Applications',
  description: 'Track internship applications, interview rounds, and outcomes.',
  path: '/applications',
  index: false,
})

export default function ApplicationsLayout({ children }: { children: React.ReactNode }) {
  return children
}
