'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import PageHeader from '@/components/PageHeader'
import ApplicationSankey from '@/components/ApplicationSankey'
import { hasPlayed, markPlayed } from '@/lib/animationState'
import { currentTerms } from '@/lib/terms'

interface Application {
  job_id: string
  saved: boolean
  status: string
  interview_rounds?: number
  term?: string | null
}

export default function SankeyPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [term, setTerm] = useState<string>(currentTerms()[1])
  const [animate, setAnimate] = useState(true)
  const { user } = useUser()
  const router = useRouter()
  const terms = currentTerms()

  useEffect(() => {
    if (hasPlayed('sankey')) {
      setAnimate(false)
    } else {
      markPlayed('sankey')
    }
  }, [])

  useEffect(() => {
    if (!user) return

    const fetchApplications = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/applications')
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (!response.ok) {
          throw new Error('Failed to fetch applications')
        }
        const data = await response.json()
        setApplications((data || []).filter((app: Application) => app.saved))
      } catch (error) {
        console.error('Error fetching applications:', error)
        setApplications([])
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [user, router])

  const termApps = useMemo(
    () => applications.filter((app) => app.term === term),
    [applications, term]
  )

  if (!user) {
    return null
  }

  const termToggle = (
    <div className="flex items-center border border-slate-200">
      {terms.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setTerm(item)}
          className={`h-8 px-3 text-xs font-bold ${
            item !== terms[0] ? 'border-l border-slate-200' : ''
          } ${term === item ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          {item}
        </button>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader title="📊 Sankey" actions={termToggle} />

      <div className="md:hidden flex items-center border-b border-slate-200">
        {terms.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTerm(item)}
            className={`flex-1 h-10 text-xs font-bold ${
              item !== terms[0] ? 'border-l border-slate-200' : ''
            } ${term === item ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className={`flex-1 px-2 py-3 md:px-6 md:py-6 ${animate ? 'animate-fade-in-up' : ''}`}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium">Loading sankey diagram...</p>
            </div>
          </div>
        ) : (
          <div className="border border-slate-200 bg-white">
            <ApplicationSankey apps={termApps} />
          </div>
        )}
      </div>
    </div>
  )
}
