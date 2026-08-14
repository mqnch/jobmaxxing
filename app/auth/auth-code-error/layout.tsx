import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  title: 'Authentication Error',
  description: 'There was an error signing in.',
  path: '/auth/auth-code-error',
  index: false,
})

export default function AuthCodeErrorLayout({ children }: { children: React.ReactNode }) {
  return children
}
