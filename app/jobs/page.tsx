'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/browser'
import JobCard from '@/components/JobCard'

interface Job {
  id: string
  company: string
  role: string
  location: string
  url: string
  date_posted: string | null
  created_at?: string
  is_trending?: boolean
}

interface UserJob {
  job_id: string
  saved: boolean
  status: string
  notes?: string
}

type SortBy = 'date' | 'company'
type SortOrder = 'asc' | 'desc'

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [user, setUser] = useState<any>(null)
  const [userJobs, setUserJobs] = useState<Record<string, UserJob>>({})
  const [loadingUserJobs, setLoadingUserJobs] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showTrendingOnly, setShowTrendingOnly] = useState(false)
  const [lastVisitTimestamp, setLastVisitTimestamp] = useState<string | null>(null)
  const limit = 50

  useEffect(() => {
    const stored = localStorage.getItem('lastJobsPageVisit')
    if (stored) {
      setLastVisitTimestamp(stored)
    }
    const now = new Date().toISOString()
    localStorage.setItem('lastJobsPageVisit', now)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const fetchUserJobs = async () => {
      if (!user) {
        setUserJobs({})
        return
      }

      setLoadingUserJobs(true)
      try {
        const response = await fetch('/api/user-jobs')
        if (response.ok) {
          const data: UserJob[] = await response.json()
          const userJobsMap: Record<string, UserJob> = {}
          data.forEach((uj) => {
            userJobsMap[uj.job_id] = uj
          })
          setUserJobs(userJobsMap)
        }
      } catch (error) {
        console.error('Error fetching user jobs:', error)
      } finally {
        setLoadingUserJobs(false)
      }
    }

    fetchUserJobs()
  }, [user])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true)
      setOffset(0)
      try {
        const params = new URLSearchParams()
        if (debouncedQuery.trim()) {
          params.append('q', debouncedQuery.trim())
        }
        if (showTrendingOnly) {
          params.append('trending', 'true')
        }
        params.append('active', 'true')
        params.append('limit', limit.toString())
        params.append('offset', '0')

        const response = await fetch(`/api/jobs?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch jobs')
        }
        const data = await response.json()
        setJobs(data || [])
        setHasMore((data || []).length === limit)
      } catch (error) {
        console.error('Error fetching jobs:', error)
        setJobs([])
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [debouncedQuery, showTrendingOnly])

  const loadMore = async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const newOffset = offset + limit
      const params = new URLSearchParams()
      if (debouncedQuery.trim()) {
        params.append('q', debouncedQuery.trim())
      }
      if (showTrendingOnly) {
        params.append('trending', 'true')
      }
      params.append('active', 'true')
      params.append('limit', limit.toString())
      params.append('offset', newOffset.toString())

      const response = await fetch(`/api/jobs?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }
      const data = await response.json()
      if (data && data.length > 0) {
        setJobs((prev) => [...prev, ...data])
        setOffset(newOffset)
        setHasMore(data.length === limit)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const sortedAndFilteredJobs = useMemo(() => {
    let filtered = [...jobs]

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = a.date_posted ? new Date(a.date_posted).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0)
        const dateB = b.date_posted ? new Date(b.date_posted).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0)
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
      } else {
        const nameA = a.company.toLowerCase()
        const nameB = b.company.toLowerCase()
        if (sortOrder === 'asc') {
          return nameA.localeCompare(nameB)
        } else {
          return nameB.localeCompare(nameA)
        }
      }
    })

    return filtered
  }, [jobs, sortBy, sortOrder])

  const handleSortChange = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder(newSortBy === 'date' ? 'desc' : 'asc')
    }
  }

  const isJobNew = (job: Job) => {
    if (!lastVisitTimestamp) return false
    const jobDateStr = job.date_posted || job.created_at
    if (!jobDateStr) return false
    const jobDate = new Date(jobDateStr).getTime()
    const lastVisit = new Date(lastVisitTimestamp).getTime()
    return jobDate > lastVisit
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-[#f5f5f5] mb-2">
          ☀️ Summer 2026 Internships
        </h1>
        <p className="text-[#a0a0a0] mb-8">
          Browse available internship opportunities
        </p>

        <div className="mb-8 space-y-4 animate-fade-in-up">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by company, role, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 bg-[#111111] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#f5f5f5] placeholder-[#888888] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#888888]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            <button
              onClick={() => setShowTrendingOnly(!showTrendingOnly)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                showTrendingOnly
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#111111] text-[#a0a0a0] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              🔥 Trending
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#888888]">Sort by:</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split('-') as [SortBy, SortOrder]
                  setSortBy(by)
                  setSortOrder(order)
                }}
                className="px-3 py-2 bg-[#111111] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="date-desc">Date Posted (Newest)</option>
                <option value="date-asc">Date Posted (Oldest)</option>
                <option value="company-asc">Company (A-Z)</option>
                <option value="company-desc">Company (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[#a0a0a0]">Loading jobs...</p>
            </div>
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
            <div className="text-6xl mb-4 animate-pulse-glow">🔍</div>
            <h3 className="text-xl font-semibold text-[#f5f5f5] mb-2">
              {debouncedQuery.trim()
                ? 'No jobs found'
                : 'No jobs available'}
            </h3>
            <p className="text-[#a0a0a0] max-w-md">
              {debouncedQuery.trim()
                ? 'Try adjusting your search terms or check back later.'
                : 'Jobs will appear here after the sync is complete.'}
            </p>
          </div>
        )}

        {!loading && sortedAndFilteredJobs.length > 0 && (
          <>
            <div className="mb-4 animate-fade-in">
              <p className="text-sm text-[#888888]">
                Found {sortedAndFilteredJobs.length} {sortedAndFilteredJobs.length === 1 ? 'job' : 'jobs'}
                {debouncedQuery.trim() && ` matching "${debouncedQuery}"`}
                {showTrendingOnly && ' (trending)'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedAndFilteredJobs.map((job, index) => {
                const userJob = userJobs[job.id]
                return (
                  <div
                    key={job.id}
                    className="animate-fade-in-up"
                    style={{
                      animationDelay: `${index * 0.05}s`,
                      animationFillMode: 'both',
                    }}
                  >
                    <JobCard
                      {...job}
                      isAuthenticated={!!user}
                      isSaved={userJob?.saved || false}
                      status={userJob?.status}
                      isNew={isJobNew(job)}
                      onSaveChange={(saved) => {
                        setUserJobs((prev) => ({
                          ...prev,
                          [job.id]: {
                            ...prev[job.id],
                            job_id: job.id,
                            saved,
                            status: prev[job.id]?.status || 'not_applied',
                          },
                        }))
                      }}
                      onStatusChange={(status) => {
                        setUserJobs((prev) => ({
                          ...prev,
                          [job.id]: {
                            ...prev[job.id],
                            job_id: job.id,
                            saved: prev[job.id]?.saved || false,
                            status,
                          },
                        }))
                      }}
                    />
                  </div>
                )
              })}
            </div>
            {hasMore && (
              <div className="mt-8 flex justify-center animate-fade-in">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-blue-500/50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
