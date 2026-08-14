'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { hasPlayed, markPlayed } from '@/lib/animationState'
import PageHeader from '@/components/PageHeader'
import CompanyLogo from '@/components/CompanyLogo'
import { prefetchCompanyLogos } from '@/lib/company-logos'
import { currentTerms, displayRole, roundsForStatus, statusForRounds } from '@/lib/terms'
import { formatJobLocation } from '@/lib/locations'

interface Application {
  job_id: string
  company: string
  role: string
  location: string
  url: string
  saved: boolean
  status: string
  notes?: string | null
  applied_at?: string | null
  last_heard_at?: string | null
  interview_rounds?: number
  term?: string | null
}

const STATUS_OPTIONS = [
  { value: 'not_applied', label: 'Not Applied' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
]

const ROUND_OPTIONS = [
  { value: 0, label: '—' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4+' },
]

const TERMS = currentTerms()

type SortColumn = 'company' | 'role' | 'status' | 'applied_at' | 'last_heard_at' | 'interview_rounds'
type SortDirection = 'asc' | 'desc'

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { user, isLoaded } = useUser()
  const [sortColumn, setSortColumn] = useState<SortColumn>('applied_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [termFilter, setTermFilter] = useState<string | 'all'>('all')
  const [animate, setAnimate] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (hasPlayed('applications')) {
      setAnimate(false)
    } else {
      markPlayed('applications')
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

  useEffect(() => {
    prefetchCompanyLogos(applications.map((app) => app.company))
  }, [applications])

  const sortedApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const sorted = applications.filter((app) => {
      if (termFilter !== 'all' && app.term !== termFilter) return false
      if (!query) return true
      return (
        app.company.toLowerCase().includes(query) ||
        app.role.toLowerCase().includes(query) ||
        app.location.toLowerCase().includes(query)
      )
    })
    sorted.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case 'company':
          aValue = a.company.toLowerCase()
          bValue = b.company.toLowerCase()
          break
        case 'role':
          aValue = a.role.toLowerCase()
          bValue = b.role.toLowerCase()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'interview_rounds':
          aValue = a.interview_rounds ?? 0
          bValue = b.interview_rounds ?? 0
          break
        case 'applied_at':
          aValue = a.applied_at ? new Date(a.applied_at).getTime() : 0
          bValue = b.applied_at ? new Date(b.applied_at).getTime() : 0
          break
        case 'last_heard_at':
          aValue = a.last_heard_at ? new Date(a.last_heard_at).getTime() : 0
          bValue = b.last_heard_at ? new Date(b.last_heard_at).getTime() : 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [applications, sortColumn, sortDirection, searchQuery, termFilter])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    const existing = applications.find((app) => app.job_id === jobId)
    const oldStatus = existing?.status
    const oldRounds = existing?.interview_rounds ?? 0
    const nextRounds = roundsForStatus(newStatus, oldRounds)
    setApplications((prev) =>
      prev.map((app) =>
        app.job_id === jobId
          ? { ...app, status: newStatus, interview_rounds: nextRounds }
          : app
      )
    )

    try {
      const response = await fetch('/api/user-job', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          status: newStatus,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      const refreshResponse = await fetch('/api/applications')
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setApplications((data || []).filter((app: Application) => app.saved))
      }
    } catch (error) {
      console.error('Error updating status:', error)
      setApplications((prev) =>
        prev.map((app) =>
          app.job_id === jobId
            ? { ...app, status: oldStatus || 'not_applied', interview_rounds: oldRounds }
            : app
        )
      )
    }
  }

  const handleRoundsChange = async (jobId: string, rounds: number) => {
    const existing = applications.find((app) => app.job_id === jobId)
    const oldRounds = existing?.interview_rounds ?? 0
    const oldStatus = existing?.status || 'not_applied'
    const nextStatus = statusForRounds(oldStatus, rounds)
    setApplications((prev) =>
      prev.map((app) =>
        app.job_id === jobId
          ? { ...app, interview_rounds: rounds, status: nextStatus }
          : app
      )
    )

    try {
      const response = await fetch('/api/user-job', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          interview_rounds: rounds,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update rounds')
      }
    } catch (error) {
      console.error('Error updating rounds:', error)
      setApplications((prev) =>
        prev.map((app) =>
          app.job_id === jobId
            ? { ...app, interview_rounds: oldRounds, status: oldStatus }
            : app
        )
      )
    }
  }

  const handleRemove = async (jobId: string) => {
    setApplications((prev) => prev.filter((app) => app.job_id !== jobId))

    try {
      const response = await fetch('/api/user-job', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove job')
      }
    } catch (error) {
      console.error('Error removing job:', error)
      const refreshResponse = await fetch('/api/applications')
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setApplications((data || []).filter((app: Application) => app.saved))
      }
    }
  }

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return (
        <svg
          className="w-4 h-4 inline ml-1 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      )
    }
    return sortDirection === 'asc' ? (
      <svg
        className="w-4 h-4 inline ml-1 text-slate-800"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 inline ml-1 text-slate-800"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader
        title="📋 My Applications"
        actions={
          <div className="flex items-center border border-slate-200">
            <button
              type="button"
              onClick={() => setTermFilter('all')}
              className={`h-8 px-3 text-xs font-bold ${
                termFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              All
            </button>
            {TERMS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setTermFilter(term)}
                className={`h-8 px-3 text-xs font-bold border-l border-slate-200 ${
                  termFilter === term
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {term}
              </button>
            ))}
          </div>
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
        <div className="md:hidden flex items-center border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTermFilter('all')}
            className={`flex-1 h-10 text-xs font-bold ${
              termFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
            }`}
          >
            All
          </button>
          {TERMS.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => setTermFilter(term)}
              className={`flex-1 h-10 text-xs font-bold border-l border-slate-200 ${
                termFilter === term ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
              }`}
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-4 md:px-6 md:py-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium">Loading applications...</p>
            </div>
          </div>
        )}

        {!loading && applications.length === 0 && (
          <div className={`flex flex-col items-center justify-center py-20 text-center ${animate ? 'animate-fade-in-up' : ''}`}>
            <div className="text-6xl mb-4 animate-pulse-glow">📋</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              No saved jobs yet
            </h3>
            <p className="text-slate-500 max-w-md mb-6 font-medium">
              Start tracking your internship applications by saving jobs from the
              jobs page.
            </p>
            <a
              href="/jobs"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-none text-white bg-slate-900 hover:bg-slate-800 transition-colors duration-200"
            >
              Browse Jobs
            </a>
          </div>
        )}

        {!loading && applications.length > 0 && sortedApplications.length === 0 && (
          <div className={`flex flex-col items-center justify-center py-20 text-center ${animate ? 'animate-fade-in-up' : ''}`}>
            <div className="text-6xl mb-4 animate-pulse-glow">🔍</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              No applications found
            </h3>
            <p className="text-slate-500 max-w-md font-medium">
              Try adjusting your search terms.
            </p>
          </div>
        )}

        {!loading && sortedApplications.length > 0 && (
          <>
            <div className={`md:hidden flex flex-col gap-3 ${animate ? 'animate-fade-in-up' : ''}`}>
              {sortedApplications.map((app, index) => (
                <div
                  key={app.job_id}
                  className={`border border-slate-200 bg-white p-4 ${animate ? 'animate-fade-in' : ''}`}
                  style={animate ? {
                    animationDelay: `${index * 0.03}s`,
                    animationFillMode: 'both',
                  } : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <CompanyLogo company={app.company} />
                      <div className="min-w-0">
                      <p className="text-slate-900 font-bold truncate">{app.company}</p>
                      <p className="text-sm text-slate-700 font-semibold mt-1 truncate" title={displayRole(app.role)}>
                        {displayRole(app.role)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{formatJobLocation(app.location)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(app.job_id)}
                      className="p-1.5 -mr-1 -mt-1 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Status
                      </span>
                      <select
                        value={app.status || 'not_applied'}
                        onChange={(e) => handleStatusChange(app.job_id, e.target.value)}
                        className="w-full px-2 py-2 bg-slate-100/60 text-sm text-slate-700 font-semibold focus:outline-none focus:bg-white"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Rounds
                      </span>
                      <select
                        value={app.interview_rounds ?? 0}
                        onChange={(e) => handleRoundsChange(app.job_id, Number(e.target.value))}
                        className="w-full px-2 py-2 bg-slate-100/60 text-sm text-slate-700 font-semibold focus:outline-none focus:bg-white"
                      >
                        {ROUND_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-3 text-xs text-slate-500 font-medium">
                    <span>Applied {formatDate(app.applied_at)}</span>
                    <span>Heard {formatDate(app.last_heard_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className={`hidden md:block overflow-x-auto rounded-none border border-slate-200 bg-white ${animate ? 'animate-fade-in-up' : ''}`}>
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100">
                    <th
                      className="w-[22%] text-left py-3 px-4 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('company')}
                    >
                      <div className="flex items-center gap-1">
                        Company <SortIcon column="company" />
                      </div>
                    </th>
                    <th
                      className="w-[32%] text-left py-3 px-4 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center gap-1">
                        Role <SortIcon column="role" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-bold text-slate-700 whitespace-nowrap">
                      Location
                    </th>
                    <th
                      className="w-28 text-left py-3 px-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status <SortIcon column="status" />
                      </div>
                    </th>
                    <th
                      className="w-20 text-left py-3 px-2 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                      onClick={() => handleSort('interview_rounds')}
                    >
                      <div className="flex items-center gap-1">
                        Rounds <SortIcon column="interview_rounds" />
                      </div>
                    </th>
                    <th
                      className="w-24 text-left py-3 px-2 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                      onClick={() => handleSort('applied_at')}
                    >
                      <div className="flex items-center gap-1">
                        Applied <SortIcon column="applied_at" />
                      </div>
                    </th>
                    <th
                      className="w-24 text-left py-3 px-2 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                      onClick={() => handleSort('last_heard_at')}
                    >
                      <div className="flex items-center gap-1">
                        Heard <SortIcon column="last_heard_at" />
                      </div>
                    </th>
                    <th className="w-32 text-left py-3 px-3 text-sm font-bold text-slate-700 whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedApplications.map((app, index) => (
                    <tr
                      key={app.job_id}
                      className={`border-b border-slate-100 hover:bg-slate-50/50 transition-all duration-200 ${animate ? 'animate-fade-in' : ''}`}
                      style={animate ? {
                        animationDelay: `${index * 0.03}s`,
                        animationFillMode: 'both',
                      } : undefined}
                    >
                      <td className="py-4 px-4 text-slate-900 font-bold">
                        <div className="flex items-center gap-2 min-w-0">
                          <CompanyLogo company={app.company} />
                          <span className="truncate" title={app.company}>{app.company}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-semibold">
                        <span className="block truncate" title={displayRole(app.role)}>
                          {displayRole(app.role)}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-slate-500 text-sm truncate" title={formatJobLocation(app.location)}>
                        {formatJobLocation(app.location)}
                      </td>
                      <td className="py-4 px-3">
                        <select
                          value={app.status || 'not_applied'}
                          onChange={(e) =>
                            handleStatusChange(app.job_id, e.target.value)
                          }
                          className="w-full px-2 py-1.5 bg-slate-100/60 rounded-none text-sm text-slate-700 font-semibold focus:outline-none focus:bg-white transition-colors duration-200"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 px-2">
                        <select
                          value={app.interview_rounds ?? 0}
                          onChange={(e) =>
                            handleRoundsChange(app.job_id, Number(e.target.value))
                          }
                          className="w-full px-1 py-1.5 bg-slate-100/60 rounded-none text-sm text-slate-700 font-semibold focus:outline-none focus:bg-white transition-colors duration-200"
                        >
                          {ROUND_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 px-2 text-slate-600 text-sm font-medium whitespace-nowrap">
                        {formatDate(app.applied_at)}
                      </td>
                      <td className="py-4 px-2 text-slate-600 text-sm font-medium whitespace-nowrap">
                        {formatDate(app.last_heard_at)}
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-2">
                          <a
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-none text-white bg-slate-900 hover:bg-slate-800 transition-colors duration-200"
                          >
                            <span>Link</span>
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                          <button
                            onClick={() => handleRemove(app.job_id)}
                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-none transition-colors duration-200"
                            title="Remove"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
