import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import ScrollToTop from '@/components/ScrollToTop'
import { ClerkProvider } from '@clerk/nextjs'
import { SeasonProvider } from '@/lib/season-context'
import { site } from '@/lib/site'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#fafafa',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    'internships',
    'internship tracker',
    'summer internships',
    'winter internships',
    'software engineering internships',
    'job applications',
    'new grad',
  ],
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  publisher: site.name,
  category: 'career',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: site.url,
    siteName: site.name,
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: site.name,
    statusBarStyle: 'default',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: site.title,
  alternateName: site.name,
  url: site.url,
  description: site.description,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} min-h-screen`}>
        <ClerkProvider>
          <SeasonProvider>
            <div className="flex flex-col md:flex-row h-screen">
              <Sidebar />
              <main id="page-scroll" className="flex-1 overflow-y-scroll min-w-0 min-h-0">
                {children}
              </main>
              <ScrollToTop />
            </div>
          </SeasonProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
