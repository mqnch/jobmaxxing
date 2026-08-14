'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import JobCard from '@/components/JobCard'
import PageHeader from '@/components/PageHeader'
import { hasPlayed, markPlayed } from '@/lib/animationState'
import { useSeason } from '@/lib/season-context'
import { JOBS_SYNCED_EVENT, syncLatestJobs, type JobsSyncDetail } from '@/lib/job-sync'
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
  no_sponsorship?: boolean
  requires_us_citizenship?: boolean
  requires_advanced_degree?: boolean
  season?: 'summer' | 'winter'
}

interface UserJob {
  job_id: string
  saved: boolean
  status: string
  notes?: string
}

type SortBy = 'date' | 'company'
type SortOrder = 'asc' | 'desc'
type ViewMode = 'card' | 'list'

const VIEW_MODE_DESKTOP_KEY = 'jobsViewMode'
const VIEW_MODE_MOBILE_KEY = 'jobsViewModeMobile'

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

function getViewModeStorageKey() {
  return isMobileViewport() ? VIEW_MODE_MOBILE_KEY : VIEW_MODE_DESKTOP_KEY
}

function getDefaultViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'card'
  const saved = localStorage.getItem(getViewModeStorageKey())
  if (saved === 'card' || saved === 'list') return saved
  return isMobileViewport() ? 'list' : 'card'
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const { user, isLoaded } = useUser()
  const { season } = useSeason()
  const [userJobs, setUserJobs] = useState<Record<string, UserJob>>({})
  const [loadingUserJobs, setLoadingUserJobs] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const loadingMoreLockRef = useRef(false)
  const jobsFetchGenRef = useRef(0)
  const offsetRef = useRef(0)
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showTrendingOnly, setShowTrendingOnly] = useState(false)
  const [showPostgradOnly, setShowPostgradOnly] = useState(false)
  const [showNoSponsorshipOnly, setShowNoSponsorshipOnly] = useState(false)
  const [showCitizenshipOnly, setShowCitizenshipOnly] = useState(false)
  const [lastVisitTimestamp, setLastVisitTimestamp] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('card')
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
    const onSynced = (event: Event) => {
      const detail = (event as CustomEvent<JobsSyncDetail>).detail
      if (!detail || detail.type !== 'success') return
      setCacheTimestamp(null)
      setSyncTrigger((prev) => prev + 1)
      showToast({
        type: 'success',
        message: detail.message,
        stats: detail.stats,
      })
    }

    window.addEventListener(JOBS_SYNCED_EVENT, onSynced)
    return () => window.removeEventListener(JOBS_SYNCED_EVENT, onSynced)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('lastJobsPageVisit')
    if (stored) {
      setLastVisitTimestamp(stored)
    }
    const now = new Date().toISOString()
    localStorage.setItem('lastJobsPageVisit', now)

    setViewMode(getDefaultViewMode())

    if (hasPlayed('jobs')) {
      setAnimate(false)
    } else {
      markPlayed('jobs')
    }
  }, [])

  useEffect(() => {
    setCacheTimestamp(localStorage.getItem(`jobs_cache_timestamp_${season}`))
  }, [season])

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
      await syncLatestJobs()
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

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(getViewModeStorageKey(), mode)
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
      jobsFetchGenRef.current += 1
      const fetchGen = jobsFetchGenRef.current
      loadingMoreLockRef.current = false
      offsetRef.current = 0
      setIsLoadingMore(false)

      const isDefaultView =
        !debouncedQuery.trim() &&
        !showTrendingOnly &&
        !showPostgradOnly &&
        !showNoSponsorshipOnly &&
        !showCitizenshipOnly
      
      let useCache = false
      if (isDefaultView && !initialFetchDone && syncTrigger === 0) {
        const cachedData = localStorage.getItem(`jobs_cache_data_${season}`)
        const cachedTime = localStorage.getItem(`jobs_cache_timestamp_${season}`)
        const cachedHasMore = localStorage.getItem(`jobs_cache_has_more_${season}`)

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
      
      try {
        const params = new URLSearchParams()
        if (debouncedQuery.trim()) {
          params.append('q', debouncedQuery.trim())
        }
        if (showTrendingOnly) {
          params.append('trending', 'true')
        }
        if (showPostgradOnly) {
          params.append('advanced_degree', 'true')
        }
        if (showNoSponsorshipOnly) {
          params.append('no_sponsorship', 'true')
        }
        if (showCitizenshipOnly) {
          params.append('citizenship', 'true')
        }
        params.append('season', season)
        params.append('active', 'true')
        params.append('limit', limit.toString())
        params.append('offset', '0')

        const response = await fetch(`/api/jobs?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch jobs')
        }
        const data = await response.json()
        if (jobsFetchGenRef.current !== fetchGen) return
        setJobs(data || [])
        setHasMore((data || []).length === limit)

        if (isDefaultView) {
          localStorage.setItem(`jobs_cache_data_${season}`, JSON.stringify(data || []))
          const now = Date.now().toString()
          localStorage.setItem(`jobs_cache_timestamp_${season}`, now)
          setCacheTimestamp(now)
          localStorage.setItem(`jobs_cache_has_more_${season}`, ((data || []).length === limit).toString())
        }
      } catch (error) {
        console.error('Error fetching jobs:', error)
        if (jobsFetchGenRef.current === fetchGen && !isSilentUpdate) {
          setJobs([])
          setHasMore(false)
        }
      } finally {
        if (jobsFetchGenRef.current === fetchGen) {
          setLoading(false)
          setInitialFetchDone(true)
        }
      }
    }

    fetchJobs()
  }, [debouncedQuery, showTrendingOnly, showPostgradOnly, showNoSponsorshipOnly, showCitizenshipOnly, syncTrigger, season])

  const loadMore = useCallback(async () => {
    if (loading || isLoadingMore || !hasMore || loadingMoreLockRef.current) return

    loadingMoreLockRef.current = true
    const fetchGen = jobsFetchGenRef.current
    const newOffset = offsetRef.current + limit
    offsetRef.current = newOffset
    setIsLoadingMore(true)
    try {
      const params = new URLSearchParams()
      if (debouncedQuery.trim()) {
        params.append('q', debouncedQuery.trim())
      }
      if (showTrendingOnly) {
        params.append('trending', 'true')
      }
      if (showPostgradOnly) {
        params.append('advanced_degree', 'true')
      }
      if (showNoSponsorshipOnly) {
        params.append('no_sponsorship', 'true')
      }
      if (showCitizenshipOnly) {
        params.append('citizenship', 'true')
      }
      params.append('season', season)
      params.append('active', 'true')
      params.append('limit', limit.toString())
      params.append('offset', newOffset.toString())

      const response = await fetch(`/api/jobs?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }
      const data = await response.json()
      if (jobsFetchGenRef.current !== fetchGen) return
      if (data && data.length > 0) {
        setJobs((prev) => {
          const seen = new Set(prev.map((job) => job.id))
          const incoming = (data as Job[]).filter((job) => !seen.has(job.id))
          return incoming.length > 0 ? [...prev, ...incoming] : prev
        })
        setHasMore(data.length === limit)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more jobs:', error)
      if (jobsFetchGenRef.current === fetchGen) {
        offsetRef.current = newOffset - limit
      }
    } finally {
      if (jobsFetchGenRef.current === fetchGen) {
        setIsLoadingMore(false)
        loadingMoreLockRef.current = false
      }
    }
  }, [loading, isLoadingMore, hasMore, limit, debouncedQuery, showTrendingOnly, showPostgradOnly, showNoSponsorshipOnly, showCitizenshipOnly, season])

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current
    if (!sentinel || !hasMore || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '400px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore, hasMore, loading, jobs.length])

  const sortedAndFilteredJobs = useMemo(() => {
    const seen = new Set<string>()
    const filtered = jobs.filter((job) => {
      if (seen.has(job.id)) return false
      seen.add(job.id)
      return true
    })

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

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      trending: jobs.filter((j) => j.is_trending).length,
    }
  }, [jobs])

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
    <div className="min-h-screen flex flex-col">
      <PageHeader
        title={season === 'summer' ? '☀️ Summer 2027 Internships' : '❄️ Winter 2027 Internships'}
        actions={
          <>
            <span className="text-sm text-slate-500 font-medium">{stats.total} listings</span>
            <span className="text-sm text-slate-500 font-medium">{stats.trending} trending</span>
            <button
              onClick={handleSyncLatest}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-none transition-colors duration-200 disabled:cursor-not-allowed"
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
          </>
        }
      />

      <div className={animate ? 'animate-fade-in-up' : ''}>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by company, role, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 px-4 pl-11 border-b border-slate-200 rounded-none text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
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
      </div>

      <div className={`px-6 pt-4 pb-2 flex items-center ${animate ? 'animate-fade-in-up' : ''}`}>
        <div className={`w-full flex flex-wrap items-center gap-4 ${animate ? 'animate-fade-in-up' : ''}`} style={animate ? { animationDelay: '0.1s', animationFillMode: 'both' } : undefined}>
          <button
            onClick={() => setShowTrendingOnly(!showTrendingOnly)}
            title="Trending"
            aria-label="Trending"
            className={`px-3 md:px-4 py-2 rounded-none border text-sm font-bold transition-colors duration-200 ${
              showTrendingOnly
                ? 'bg-orange-600 border-orange-600 text-white hover:bg-orange-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🔥<span className="hidden md:inline"> Trending</span>
          </button>
          <button
            onClick={() => setShowPostgradOnly(!showPostgradOnly)}
            title="Postgrad"
            aria-label="Postgrad"
            className={`px-3 md:px-4 py-2 rounded-none border text-sm font-bold transition-colors duration-200 ${
              showPostgradOnly
                ? 'bg-violet-700 border-violet-700 text-white hover:bg-violet-800'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🎓<span className="hidden md:inline"> Postgrad</span>
          </button>
          <button
            onClick={() => setShowNoSponsorshipOnly(!showNoSponsorshipOnly)}
            title="No Sponsorship"
            aria-label="No Sponsorship"
            className={`px-3 md:px-4 py-2 rounded-none border text-sm font-bold transition-colors duration-200 ${
              showNoSponsorshipOnly
                ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🛂<span className="hidden md:inline"> No Sponsorship</span>
          </button>
          <button
            onClick={() => setShowCitizenshipOnly(!showCitizenshipOnly)}
            title="US Citizenship"
            aria-label="US Citizenship"
            className={`px-3 md:px-4 py-2 rounded-none border text-sm font-bold transition-colors duration-200 ${
              showCitizenshipOnly
                ? 'bg-blue-700 border-blue-700 text-white hover:bg-blue-800'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🇺🇸<span className="hidden md:inline"> US Citizenship</span>
          </button>

          <div className="flex items-center justify-between gap-4 w-full md:w-auto md:ml-auto md:justify-start">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 font-medium">Sort by:</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split('-') as [SortBy, SortOrder]
                  setSortBy(by)
                  setSortOrder(order)
                }}
                className="px-3 py-2 border border-slate-200 rounded-none text-sm text-slate-700 font-semibold focus:outline-none focus:border-slate-400 transition-colors"
              >
                <option value="date-desc">Date Posted (Newest)</option>
                <option value="date-asc">Date Posted (Oldest)</option>
                <option value="company-asc">Company (A-Z)</option>
                <option value="company-desc">Company (Z-A)</option>
              </select>
            </div>

            <div className="flex border border-slate-200">
              <button
                onClick={() => changeViewMode('card')}
                className={`p-2 border-r border-slate-200 transition-colors duration-200 ${
                  viewMode === 'card'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
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
                className={`p-2 transition-colors duration-200 ${
                  viewMode === 'list'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
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
      </div>

      <div className="flex-1 px-6 py-6">
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
            <div className={`hidden md:block mb-4 ${animate ? 'animate-fade-in' : ''}`}>
              <p className="text-sm text-slate-400 font-medium">
                Found {sortedAndFilteredJobs.length} {sortedAndFilteredJobs.length === 1 ? 'job' : 'jobs'}
                {debouncedQuery.trim() && ` matching "${debouncedQuery}"`}
                {showTrendingOnly && ' · trending'}
                {showPostgradOnly && ' · postgrad'}
                {showNoSponsorshipOnly && ' · no sponsorship'}
                {showCitizenshipOnly && ' · US citizenship'}
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
                        setUserJobs((prev) => {
                          const currentStatus = prev[job.id]?.status || 'not_applied'
                          return {
                            ...prev,
                            [job.id]: {
                              ...prev[job.id],
                              job_id: job.id,
                              saved,
                              status: saved && currentStatus === 'not_applied' ? 'applied' : currentStatus,
                            },
                          }
                        })
                      }}
                      onStatusChange={(status) => {
                        setUserJobs((prev) => ({
                          ...prev,
                          [job.id]: {
                            ...prev[job.id],
                            job_id: job.id,
                            saved:
                              (prev[job.id]?.status || 'not_applied') === 'not_applied' &&
                              status !== 'not_applied'
                                ? true
                                : prev[job.id]?.saved || false,
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
              <div
                ref={loadMoreSentinelRef}
                className="mt-8 flex justify-center py-6 min-h-[4rem]"
                aria-hidden={!isLoadingMore}
              >
                {isLoadingMore && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm font-medium">Loading more jobs...</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast Container */}
      {syncStatus && (
        <div className={`fixed bottom-5 right-5 z-50 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-4 rounded-none flex flex-col gap-3 max-w-sm w-96 overflow-hidden ${
          isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
        }`}>
          <div className="flex items-start gap-3">
            {syncStatus.type === 'success' && (
              <div className="flex items-center justify-center w-8 h-8 rounded-none bg-emerald-50 text-emerald-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            {syncStatus.type === 'warning' && (
              <div className="flex items-center justify-center w-8 h-8 rounded-none bg-amber-50 text-amber-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
            )}
            {syncStatus.type === 'error' && (
              <div className="flex items-center justify-center w-8 h-8 rounded-none bg-rose-50 text-rose-600 shrink-0">
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
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-none hover:bg-slate-100 shrink-0 -mt-1 -mr-1"
              aria-label="Close notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {syncStatus.stats && (
            <div className="grid grid-cols-3 gap-2 mt-1 border-t border-slate-100 pt-3">
              <div className="bg-emerald-50/50 rounded-none p-2.5 text-center border border-emerald-100/50">
                <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700/80 mb-0.5">Added</p>
                <p className="text-base font-extrabold text-emerald-600">+{syncStatus.stats.inserted}</p>
              </div>
              <div className="bg-blue-50/50 rounded-none p-2.5 text-center border border-blue-100/50">
                <p className="text-[10px] uppercase tracking-wider font-bold text-blue-700/80 mb-0.5">Updated</p>
                <p className="text-base font-extrabold text-blue-600">{syncStatus.stats.updated}</p>
              </div>
              <div className="bg-slate-50 rounded-none p-2.5 text-center border border-slate-100">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-600/80 mb-0.5">Closed</p>
                <p className="text-base font-extrabold text-slate-700">{syncStatus.stats.deactivated}</p>
              </div>
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 rounded-none overflow-hidden">
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
