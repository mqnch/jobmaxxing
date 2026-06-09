import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

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
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <ClerkProvider appearance={{ baseTheme: dark }}>
          <Navbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  )
}
