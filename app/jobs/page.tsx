'use client'

import { useEffect, useState, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import JobCard from '@/components/JobCard'
import { hasPlayed, markPlayed } from '@/lib/animationState'
import { formatDistanceToNowStrict } from 'date-fns'

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
  const { user, isLoaded } = useUser()
  const [userJobs, setUserJobs] = useState<Record<string, UserJob>>({})
  const [loadingUserJobs, setLoadingUserJobs] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showTrendingOnly, setShowTrendingOnly] = useState(false)
  const [lastVisitTimestamp, setLastVisitTimestamp] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [animate, setAnimate] = useState(true)
  const limit = 50

  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{
    type: 'success' | 'warning' | 'error'
    message: string
    stats?: {
      inserted: number
      updated: number
      deactivated: number
    }
  } | null>(null)
  const [isExiting, setIsExiting] = useState(false)

  const showToast = (status: {
    type: 'success' | 'warning' | 'error'
    message: string
    stats?: {
      inserted: number
      updated: number
      deactivated: number
    }
  } | null) => {
    setIsExiting(false)
    setSyncStatus(status)
  }

  const handleCloseToast = () => {
    setIsExiting(true)
    setTimeout(() => {
      setSyncStatus(null)
      setIsExiting(false)
    }, 400)
  }

  const [syncTrigger, setSyncTrigger] = useState(0)
  const [initialFetchDone, setInitialFetchDone] = useState(false)
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('lastJobsPageVisit')
    if (stored) {
      setLastVisitTimestamp(stored)
    }
    const now = new Date().toISOString()
    localStorage.setItem('lastJobsPageVisit', now)

    const savedViewMode = localStorage.getItem('jobsViewMode')
    if (savedViewMode === 'card' || savedViewMode === 'list') {
      setViewMode(savedViewMode)
    }

    if (hasPlayed('jobs')) {
      setAnimate(false)
    } else {
      markPlayed('jobs')
    }

    setCacheTimestamp(localStorage.getItem('jobs_cache_timestamp'))
  }, [])

  useEffect(() => {
    if (syncStatus && !isExiting) {
      const timer = setTimeout(() => {
        handleCloseToast()
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [syncStatus, isExiting])

  const formatLastSynced = (timestampStr: string | null) => {
    if (!timestampStr) return null
    try {
      const timestamp = parseInt(timestampStr, 10)
      if (isNaN(timestamp)) return null
      return formatDistanceToNowStrict(new Date(timestamp), { addSuffix: true })
    } catch {
      return null
    }
  }

  const handleSyncLatest = async () => {
    if (!user) {
      showToast({
        type: 'warning',
        message: 'Please sign in to sync the latest internship jobs from GitHub.',
      })
      return
    }

    setIsSyncing(true)
    try {
      const response = await fetch('/api/jobs/sync', {
        method: 'POST',
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to sync')
      }

      const stats = result.stats
      showToast({
        type: 'success',
        message: 'Successfully synchronized the latest jobs from GitHub.',
        stats: {
          inserted: stats.inserted || 0,
          updated: stats.updated || 0,
          deactivated: stats.deactivated || 0,
        },
      })

      const now = Date.now().toString()
      localStorage.setItem('jobs_cache_timestamp', now)
      setCacheTimestamp(now)
      setSyncTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Sync error:', error)
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'An error occurred while syncing jobs.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const changeViewMode = (mode: 'card' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('jobsViewMode', mode)
  }

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
      const isDefaultView = !debouncedQuery.trim() && !showTrendingOnly
      
      let useCache = false
      if (isDefaultView && !initialFetchDone && syncTrigger === 0) {
        const cachedData = localStorage.getItem('jobs_cache_data')
        const cachedTime = localStorage.getItem('jobs_cache_timestamp')
        const cachedHasMore = localStorage.getItem('jobs_cache_has_more')

        if (cachedData && cachedTime) {
          try {
            const parsed = JSON.parse(cachedData)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setJobs(parsed)
              setHasMore(cachedHasMore === 'true')
              useCache = true
              
              const ageInMs = Date.now() - parseInt(cachedTime, 10)
              const cacheDuration = 5 * 60 * 1000 // 5 minutes
              if (ageInMs < cacheDuration) {
                setLoading(false)
                setInitialFetchDone(true)
                return
              }
            }
          } catch (e) {
            console.error('Failed to parse cached jobs:', e)
          }
        }
      }

      const isSilentUpdate = useCache
      
      if (!isSilentUpdate) {
        setLoading(true)
      }
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

        if (isDefaultView) {
          localStorage.setItem('jobs_cache_data', JSON.stringify(data || []))
          const now = Date.now().toString()
          localStorage.setItem('jobs_cache_timestamp', now)
          setCacheTimestamp(now)
          localStorage.setItem('jobs_cache_has_more', ((data || []).length === limit).toString())
        }
      } catch (error) {
        console.error('Error fetching jobs:', error)
        if (!isSilentUpdate) {
          setJobs([])
          setHasMore(false)
        }
      } finally {
        setLoading(false)
        setInitialFetchDone(true)
      }
    }

    fetchJobs()
  }, [debouncedQuery, showTrendingOnly, syncTrigger])

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              🍂 Fall 2026 Internships
            </h1>
            <p className="text-slate-500 font-medium">
              Browse available internship opportunities
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncLatest}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-200/50 text-white text-sm font-semibold rounded-xl shadow-md disabled:shadow-none transition-all duration-200 border border-slate-850/50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              <span>Sync Manually</span>
            </button>
          </div>
        </div>

        <div className={`mb-8 space-y-4 ${animate ? 'animate-fade-in-up' : ''}`}>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by company, role, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-11 bg-slate-100/60 rounded-none text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white transition-all"
            />
            <svg
              className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
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
          
          <div className={`flex flex-wrap items-center gap-4 ${animate ? 'animate-fade-in-up' : ''}`} style={animate ? { animationDelay: '0.1s', animationFillMode: 'both' } : undefined}>
            <button
              onClick={() => setShowTrendingOnly(!showTrendingOnly)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors duration-200 ${
                showTrendingOnly
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🔥 Trending
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 font-medium">Sort by:</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split('-') as [SortBy, SortOrder]
                  setSortBy(by)
                  setSortOrder(order)
                }}
                className="px-3 py-2 bg-slate-100/60 rounded-none text-sm text-slate-700 font-semibold focus:outline-none focus:bg-white transition-all"
              >
                <option value="date-desc">Date Posted (Newest)</option>
                <option value="date-asc">Date Posted (Oldest)</option>
                <option value="company-asc">Company (A-Z)</option>
                <option value="company-desc">Company (Z-A)</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-100/60 p-1 rounded-lg sm:ml-auto">
              <button
                onClick={() => changeViewMode('card')}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                  viewMode === 'card'
                    ? 'bg-white shadow-sm text-slate-800'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Card View"
                aria-label="Card View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => changeViewMode('list')}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-slate-800'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="List View"
                aria-label="List View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium">Loading jobs...</p>
            </div>
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className={`flex flex-col items-center justify-center py-20 text-center ${animate ? 'animate-fade-in-up' : ''}`}>
            <div className="text-6xl mb-4 animate-pulse-glow">🔍</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {debouncedQuery.trim()
                ? 'No jobs found'
                : 'No jobs available'}
            </h3>
            <p className="text-slate-500 max-w-md font-medium">
              {debouncedQuery.trim()
                ? 'Try adjusting your search terms or check back later.'
                : 'Jobs will appear here after the sync is complete.'}
            </p>
          </div>
        )}

        {!loading && sortedAndFilteredJobs.length > 0 && (
          <>
            <div className={`mb-4 ${animate ? 'animate-fade-in' : ''}`}>
              <p className="text-sm text-slate-400 font-medium">
                Found {sortedAndFilteredJobs.length} {sortedAndFilteredJobs.length === 1 ? 'job' : 'jobs'}
                {debouncedQuery.trim() && ` matching "${debouncedQuery}"`}
                {showTrendingOnly && ' (trending)'}
              </p>
            </div>
            <div className={viewMode === 'card' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-3"}>
              {sortedAndFilteredJobs.map((job, index) => {
                const userJob = userJobs[job.id]
                return (
                  <div
                    key={job.id}
                    className={`${animate ? 'animate-fade-in-up' : ''} ${viewMode === 'card' ? 'h-full' : 'w-full'}`}
                    style={animate ? {
                      animationDelay: `${index * 0.03}s`,
                      animationFillMode: 'both',
                    } : undefined}
                  >
                    <JobCard
                      {...job}
                      viewMode={viewMode}
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
              <div className={`mt-8 flex justify-center ${animate ? 'animate-fade-in' : ''}`}>
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-800 disabled:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors duration-200"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast Container */}
      {syncStatus && (
        <div className={`fixed bottom-5 right-5 z-50 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-4 rounded-2xl flex flex-col gap-3 max-w-sm w-96 overflow-hidden ${
          isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
        }`}>
          <div className="flex items-start gap-3">
            {syncStatus.type === 'success' && (
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            {syncStatus.type === 'warning' && (
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
            )}
            {syncStatus.type === 'error' && (
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            
            <div className="flex-1 min-w-0 flex items-center h-8">
              <p className="font-bold text-xs text-slate-900">
                {syncStatus.type === 'success' ? 'Sync Complete' : syncStatus.type === 'warning' ? 'Attention Required' : 'Sync Failed'}
              </p>
            </div>
            
            <button
              onClick={handleCloseToast}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 shrink-0 -mt-1 -mr-1"
              aria-label="Close notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {syncStatus.stats && (
            <div className="grid grid-cols-3 gap-2 mt-1 border-t border-slate-100 pt-3">
              <div className="bg-emerald-50/50 rounded-xl p-2.5 text-center border border-emerald-100/50">
                <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700/80 mb-0.5">Added</p>
                <p className="text-base font-extrabold text-emerald-600">+{syncStatus.stats.inserted}</p>
              </div>
              <div className="bg-blue-50/50 rounded-xl p-2.5 text-center border border-blue-100/50">
                <p className="text-[10px] uppercase tracking-wider font-bold text-blue-700/80 mb-0.5">Updated</p>
                <p className="text-base font-extrabold text-blue-600">{syncStatus.stats.updated}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-600/80 mb-0.5">Closed</p>
                <p className="text-base font-extrabold text-slate-700">{syncStatus.stats.deactivated}</p>
              </div>
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 rounded-b-2xl overflow-hidden">
            <div 
              className={`h-full animate-shrink-width ${
                syncStatus.type === 'success' ? 'bg-emerald-500' : syncStatus.type === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  )
}
