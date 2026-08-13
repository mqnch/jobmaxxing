import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { ClerkProvider } from '@clerk/nextjs'
import { SeasonProvider } from '@/lib/season-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'get a job, chud',
  description: 'track your internship applications',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <ClerkProvider>
          <SeasonProvider>
            <div className="flex flex-col md:flex-row h-screen">
              <Sidebar />
              <main className="flex-1 overflow-y-auto min-w-0 min-h-0">{children}</main>
            </div>
          </SeasonProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
