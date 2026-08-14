import type { Metadata } from 'next'

export const site = {
  name: 'getajobchud',
  domain: 'getajobchud.com',
  url: 'https://getajobchud.com',
  title: 'get a job, chud',
  description:
    'Browse summer and winter internships, track your applications, and watch your pipeline. Get a job, chud.',
} as const

export function pageMetadata({
  title,
  description = site.description,
  path,
  index = true,
}: {
  title: string
  description?: string
  path: string
  index?: boolean
}): Metadata {
  const url = new URL(path, site.url).toString()

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: site.name,
      title,
      description,
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: index
      ? undefined
      : {
          index: false,
          follow: false,
        },
  }
}
