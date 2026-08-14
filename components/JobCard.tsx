'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNowStrict, parseISO } from 'date-fns'

interface JobCardProps {
  id: string
  company: string
  role: string
  location: string
  url: string
  date_posted?: string | null
  created_at?: string
  is_trending?: boolean
  no_sponsorship?: boolean
  requires_us_citizenship?: boolean
  requires_advanced_degree?: boolean
  season?: 'summer' | 'winter'
  isSaved?: boolean
  status?: string
  isNew?: boolean
  onSaveChange?: (saved: boolean) => void
  onStatusChange?: (status: string) => void
  isAuthenticated?: boolean
  viewMode?: 'card' | 'list'
}

const STATUS_OPTIONS = [
  { value: 'not_applied', label: 'Not Applied' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
]

const formatDatePosted = (dateString?: string) => {
  if (!dateString) return 'Recently'
  try {
    const date = parseISO(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 24 * 60 * 60 * 1000) {
      return formatDistanceToNowStrict(date, { addSuffix: true })
    }
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return formatDistanceToNowStrict(date, { addSuffix: true })
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  } catch {
    return 'Recently'
  }
}

const formatLocation = (location: string): string => {
  if (!location || !location.trim()) {
    return location
  }

  let fixedLocation = location.replace(/([a-z])([A-Z][a-z]+)/g, '$1, $2')

  const parts = fixedLocation
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)

  if (parts.length >= 6) {
    const locations: string[] = []
    let currentLocation: string[] = []
    
    const commonCountries = new Set(['Canada', 'USA', 'United States', 'United Kingdom', 'UK', 'Mexico', 'Australia', 'Germany', 'France', 'India', 'China', 'Japan'])
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      currentLocation.push(part)
      
      const isStateCode = /^[A-Z]{2}$/.test(part)
      const isCountry = commonCountries.has(part)
      
      if (i < parts.length - 1) {
        const nextPart = parts[i + 1]
        const nextIsStateCode = /^[A-Z]{2}$/.test(nextPart)
        const nextIsCountry = commonCountries.has(nextPart)
        const nextIsCity = !nextIsStateCode && !nextIsCountry && /^[A-Z][a-z]/.test(nextPart)
        
        if (currentLocation.length >= 3 && nextIsCity) {
          locations.push(currentLocation.join(', '))
          currentLocation = []
          continue
        }
        
        if (currentLocation.length === 2 && isCountry && nextIsCity) {
          locations.push(currentLocation.join(', '))
          currentLocation = []
          continue
        }
        
        if (isStateCode && currentLocation.length >= 2 && nextIsCity && !nextIsCountry) {
          locations.push(currentLocation.join(', '))
          currentLocation = []
          continue
        }
      }
    }
    
    if (currentLocation.length > 0) {
      locations.push(currentLocation.join(', '))
    }
    
    if (locations.length > 1) {
      return locations.join(' — ')
    }
  }

  return fixedLocation
}

const MAX_LOCATION_CHARS = 72

function displayLocation(location: string): { text: string; full: string } {
  const full = formatLocation(location)
  const parts = full.split(/\s+[—–]\s+/).map((part) => part.trim()).filter(Boolean)

  let text = full
  if (parts.length > 2) {
    text = `${parts.slice(0, 2).join(' — ')}...`
  } else if (full.length > MAX_LOCATION_CHARS) {
    text = `${full.slice(0, MAX_LOCATION_CHARS - 3).trimEnd()}...`
  }

  return { text, full }
}

function JobFlagBadges({
  is_trending,
  no_sponsorship,
  requires_us_citizenship,
  requires_advanced_degree,
  textSizeClass,
}: {
  is_trending?: boolean
  no_sponsorship?: boolean
  requires_us_citizenship?: boolean
  requires_advanced_degree?: boolean
  textSizeClass: string
}) {
  return (
    <>
      {is_trending && (
        <span className={`${textSizeClass} shrink-0`} title="FAANG+ company">
          🔥
        </span>
      )}
      {no_sponsorship && (
        <span className={`${textSizeClass} shrink-0`} title="Does NOT offer visa sponsorship">
          🛂
        </span>
      )}
      {requires_us_citizenship && (
        <span className={`${textSizeClass} shrink-0`} title="Requires U.S. citizenship">
          🇺🇸
        </span>
      )}
      {requires_advanced_degree && (
        <span className={`${textSizeClass} shrink-0`} title="Requires an advanced degree (Master's, PhD, or MBA)">
          🎓
        </span>
      )}
    </>
  )
}

export default function JobCard({
  company,
  role,
  location,
  url,
  id,
  date_posted,
  created_at,
  is_trending = false,
  no_sponsorship = false,
  requires_us_citizenship = false,
  requires_advanced_degree = false,
  season,
  isSaved = false,
  status,
  isNew = false,
  onSaveChange,
  onStatusChange,
  isAuthenticated = false,
  viewMode = 'card',
}: JobCardProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const { text: locationText, full: locationFull } = displayLocation(location)

  const handleSaveToggle = async () => {
    if (!isAuthenticated || !onSaveChange) return

    setIsSaving(true)
    try {
      const newSavedState = !isSaved
      const currentStatus = status || 'not_applied'
      const shouldMarkApplied = newSavedState && currentStatus === 'not_applied'
      const response = await fetch('/api/user-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: id,
          saved: newSavedState,
          ...(shouldMarkApplied ? { status: 'applied' } : {}),
        }),
      })

      if (response.ok) {
        onSaveChange(newSavedState)
        if (shouldMarkApplied) {
          onStatusChange?.('applied')
        }
      }
    } catch (error) {
      console.error('Error saving job:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!isAuthenticated || !onStatusChange) return

    setIsUpdatingStatus(true)
    try {
      const currentStatus = status || 'not_applied'
      const shouldAutoSave = currentStatus === 'not_applied' && newStatus !== 'not_applied'
      const response = await fetch('/api/user-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: id,
          status: newStatus,
          ...(shouldAutoSave ? { saved: true } : {}),
        }),
      })

      if (response.ok) {
        onStatusChange(newStatus)
        if (shouldAutoSave) {
          onSaveChange?.(true)
        }
      } else {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          if (errorData.error || errorData.message) {
            errorMessage = errorData.message || errorData.error || errorMessage
            console.error('Error updating status:', errorData)
          } else {
            console.error('Error updating status:', errorData)
          }
        } catch (parseError) {
          console.error('Error updating status:', errorMessage)
        }
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleApply = () => {
    if (!isAuthenticated) return

    const currentStatus = status || 'not_applied'
    const shouldMarkApplied = currentStatus === 'not_applied'

    void (async () => {
      try {
        const response = await fetch('/api/user-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: id,
            saved: true,
            ...(shouldMarkApplied ? { status: 'applied' } : {}),
          }),
        })

        if (response.ok) {
          onSaveChange?.(true)
          if (shouldMarkApplied) {
            onStatusChange?.('applied')
          }
        }
      } catch (error) {
        console.error('Error marking job applied:', error)
      }
    })()
  }

  if (viewMode === 'list') {
    return (
      <div className="w-full p-4 md:p-5 rounded-none border border-slate-200/80 bg-white hover:bg-slate-50/50 hover:border-slate-300 transition-all duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
            <div className="hidden md:flex items-center justify-center w-9 h-9 rounded-none bg-slate-100 text-base shrink-0" title={season === 'winter' ? 'Winter internship' : 'Summer internship'}>
              {season === 'winter' ? '❄️' : '☀️'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-base font-bold text-slate-800 tracking-tight truncate">
                  {company}
                </h3>
                <JobFlagBadges
                  is_trending={is_trending}
                  no_sponsorship={no_sponsorship}
                  requires_us_citizenship={requires_us_citizenship}
                  requires_advanced_degree={requires_advanced_degree}
                  textSizeClass="text-base"
                />
                {isNew && (
                  <span className="px-2 py-0.5 text-xs font-semibold text-white bg-red-600 rounded-none shrink-0">
                    NEW
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm min-w-0">
                <p className="font-semibold text-slate-700 truncate sm:max-w-[46%]">{role}</p>
                <span className="hidden sm:inline text-slate-300">•</span>
                <p className="text-slate-500 flex items-center gap-1 min-w-0 max-w-[40%]">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate" title={locationFull}>{locationText}</span>
                </p>
                {(date_posted || created_at) && (
                  <>
                    <span className="hidden sm:inline text-slate-300 shrink-0">•</span>
                    <span className="text-xs text-slate-400 font-medium shrink-0">
                      Posted {formatDatePosted(date_posted || created_at)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end">
            {isAuthenticated ? (
              <div className="w-40 shrink-0">
                <select
                  value={status || 'not_applied'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdatingStatus}
                  className="w-full px-3 py-1.5 bg-slate-100/60 rounded-none text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-right shrink-0">
                <Link
                  href="/login"
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                >
                  Sign in to track
                </Link>
              </div>
            )}

            <div className="flex items-center gap-2 shrink-0">
              {isAuthenticated && (
                <button
                  onClick={handleSaveToggle}
                  disabled={isSaving}
                  className={`p-1.5 rounded-none bg-slate-50 hover:bg-slate-100 transition-all duration-200 ${
                    isSaved
                      ? 'text-yellow-500 hover:text-yellow-600'
                      : 'text-slate-400 hover:text-slate-600'
                  } disabled:opacity-50`}
                  title={isSaved ? 'Unsave job' : 'Save job'}
                >
                  <svg
                    className="w-5 h-5"
                    fill={isSaved ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                </button>
              )}

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleApply}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-none text-white bg-slate-900 hover:bg-slate-800 transition-all duration-200"
              >
                <span>Apply</span>
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
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-6 rounded-none border border-slate-200 bg-white hover:bg-slate-50/50 hover:border-slate-300 transition-all duration-200">
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                  {company}
                </h3>
                <JobFlagBadges
                  is_trending={is_trending}
                  no_sponsorship={no_sponsorship}
                  requires_us_citizenship={requires_us_citizenship}
                  requires_advanced_degree={requires_advanced_degree}
                  textSizeClass="text-lg"
                />
                {isNew && (
                  <span className="px-2 py-0.5 text-xs font-semibold text-white bg-red-600 rounded-none">
                    NEW
                  </span>
                )}
              </div>
              {(date_posted || created_at) && (
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Posted {formatDatePosted(date_posted || created_at)}
                </p>
              )}
            </div>
            {isAuthenticated && (
              <button
                onClick={handleSaveToggle}
                disabled={isSaving}
                className={`p-1.5 rounded-none bg-slate-50 hover:bg-slate-100 transition-all duration-200 ${
                  isSaved
                    ? 'text-yellow-500 hover:text-yellow-600'
                    : 'text-slate-400 hover:text-slate-600'
                } disabled:opacity-50`}
                title={isSaved ? 'Unsave job' : 'Save job'}
              >
                <svg
                  className="w-5 h-5"
                  fill={isSaved ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </button>
            )}
          </div>
          <p className="text-base font-semibold text-slate-700 mb-2 leading-snug">{role}</p>
          <p className="text-sm text-slate-500 mb-4 flex items-start gap-1.5 min-w-0">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate" title={locationFull}>{locationText}</span>
          </p>

          {isAuthenticated ? (
            <div className="mb-4">
              <select
                value={status || 'not_applied'}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isUpdatingStatus}
                className="w-full px-3 py-2 bg-slate-100/60 rounded-none text-sm text-slate-800 font-semibold focus:outline-none focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mb-4">
              <Link
                href="/login"
                className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
              >
                Sign in to track application
              </Link>
            </div>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleApply}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-none text-white bg-slate-900 hover:bg-slate-800 transition-all duration-200 w-fit"
        >
          <span>Apply</span>
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
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </div>
  )
}
