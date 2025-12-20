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
  isSaved?: boolean
  status?: string
  isNew?: boolean
  onSaveChange?: (saved: boolean) => void
  onStatusChange?: (status: string) => void
  isAuthenticated?: boolean
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

export default function JobCard({
  company,
  role,
  location,
  url,
  id,
  date_posted,
  created_at,
  is_trending = false,
  isSaved = false,
  status,
  isNew = false,
  onSaveChange,
  onStatusChange,
  isAuthenticated = false,
}: JobCardProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const handleSaveToggle = async () => {
    if (!isAuthenticated || !onSaveChange) return

    setIsSaving(true)
    try {
      const newSavedState = !isSaved
      const response = await fetch('/api/user-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: id,
          saved: newSavedState,
        }),
      })

      if (response.ok) {
        onSaveChange(newSavedState)
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
      const response = await fetch('/api/user-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: id,
          status: newStatus,
        }),
      })

      if (response.ok) {
        onStatusChange(newStatus)
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

  return (
    <div className="p-6 rounded-lg border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-[#f5f5f5]">
                  {company}
                </h3>
                {is_trending && (
                  <span className="text-lg" title="Trending job">🔥</span>
                )}
                {isNew && (
                  <span className="px-2 py-0.5 text-xs font-semibold text-white bg-red-600 rounded">
                    NEW
                  </span>
                )}
              </div>
              {(date_posted || created_at) && (
                <p className="text-xs text-[#888888] mt-1">
                  Posted {formatDatePosted(date_posted || created_at)}
                </p>
              )}
            </div>
            {isAuthenticated && (
              <button
                onClick={handleSaveToggle}
                disabled={isSaving}
                className={`p-1.5 rounded transition-all duration-200 hover:scale-110 active:scale-95 ${
                  isSaved
                    ? 'text-yellow-400 hover:text-yellow-300'
                    : 'text-[#888888] hover:text-[#a0a0a0]'
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
          <p className="text-base text-[#a0a0a0] mb-2">{role}</p>
          <p className="text-sm text-[#888888] mb-4">{formatLocation(location)}</p>

          {isAuthenticated ? (
            <div className="mb-4">
              <select
                value={status || 'not_applied'}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isUpdatingStatus}
                className="w-full px-3 py-2 bg-[#111111] border border-[rgba(255,255,255,0.1)] rounded-md text-sm text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="text-xs text-[#888888] hover:text-[#a0a0a0] transition-colors"
              >
                Sign in to track
              </Link>
            </div>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md hover:shadow-blue-500/50 w-fit"
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
