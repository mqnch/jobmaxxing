import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  title: 'Pipeline',
  path: '/pipeline',
  index: false,
})

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return children
}
