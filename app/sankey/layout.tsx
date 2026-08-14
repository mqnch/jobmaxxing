import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  title: 'Pipeline',
  description: 'See how your internship applications move from applied to offer.',
  path: '/sankey',
  index: false,
})

export default function SankeyLayout({ children }: { children: React.ReactNode }) {
  return children
}
