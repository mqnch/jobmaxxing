import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  title: 'Login',
  description: 'Sign in to track internship applications.',
  path: '/login',
  index: false,
})

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
