'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useUser, UserButton, Show } from '@clerk/nextjs'
import { useSeason, Season } from '@/lib/season-context'
import { syncLatestJobs } from '@/lib/job-sync'

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { season, setSeason } = useSeason()

  const items: Array<{
    key: string
    label: string
    icon: string
    isActive: boolean
    onClick: () => void
  }> = [
    {
      key: 'winter',
      label: 'Winter',
      icon: '❄️',
      isActive: pathname === '/jobs' && season === 'winter',
      onClick: () => setSeason('winter' as Season),
    },
    {
      key: 'summer',
      label: 'Summer',
      icon: '☀️',
      isActive: pathname === '/jobs' && season === 'summer',
      onClick: () => setSeason('summer' as Season),
    },
    {
      key: 'apps',
      label: 'Applications',
      icon: '📋',
      isActive: pathname === '/applications',
      onClick: () => {},
    },
    {
      key: 'sankey',
      label: 'Sankey Diagram',
      icon: '📊',
      isActive: pathname === '/sankey' || pathname === '/pipeline',
      onClick: () => {},
    },
  ]

  return (
    <nav className="flex flex-col">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.key === 'apps' ? '/applications' : item.key === 'sankey' ? '/sankey' : '/jobs'}
          onClick={() => {
            item.onClick()
            onNavigate?.()
          }}
          className={`h-12 flex items-center gap-3 px-4 text-sm font-semibold transition-colors ${
            item.isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

function AuthSection({ isLoaded, isSignedIn, user, onNavigate }: {
  isLoaded: boolean
  isSignedIn: boolean | undefined
  user: ReturnType<typeof useUser>['user']
  onNavigate?: () => void
}) {
  if (!isLoaded) {
    return <span className="text-slate-400 text-sm animate-pulse px-4">Loading...</span>
  }

  return (
    <>
      <Show when="signed-in">
        <div className="flex items-center gap-3 px-4">
          <UserButton />
          <span className="text-slate-600 text-xs font-medium truncate">
            {user?.primaryEmailAddress?.emailAddress}
          </span>
        </div>
      </Show>
      <Show when="signed-out">
        <div className="px-4">
          <Link
            href="/login"
            onClick={onNavigate}
            className="block text-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-sm font-semibold transition-colors duration-200"
          >
            Login
          </Link>
        </div>
      </Show>
    </>
  )
}

export default function Sidebar() {
  const { isLoaded, isSignedIn, user } = useUser()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const handleMobileSync = async () => {
    if (!user) {
      setSyncMessage('Sign in to sync jobs')
      return
    }

    setIsSyncing(true)
    setSyncMessage(null)
    try {
      await syncLatestJobs()
      setSyncMessage('Synced')
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/jobs" className="text-slate-900 font-bold text-lg tracking-tight">
            getajobchud.com
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-slate-700 p-2 hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="relative block w-5 h-5">
              <span
                className={`absolute left-0 right-0 h-[1.5px] bg-slate-800 transition-all duration-200 ease-out ${
                  mobileMenuOpen ? 'top-[9px] rotate-45' : 'top-[4px] rotate-0'
                }`}
              />
              <span
                className={`absolute left-0 right-0 top-[9px] h-[1.5px] bg-slate-800 transition-opacity duration-200 ease-out ${
                  mobileMenuOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute left-0 right-0 h-[1.5px] bg-slate-800 transition-all duration-200 ease-out ${
                  mobileMenuOpen ? 'top-[9px] -rotate-45' : 'top-[14px] rotate-0'
                }`}
              />
            </span>
          </button>
        </div>
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
            mobileMenuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div
              className={`border-t border-slate-200 bg-white transition-opacity duration-200 ${
                mobileMenuOpen ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <NavLinks pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
              <div className="px-4 py-3 border-t border-slate-200">
                <button
                  onClick={handleMobileSync}
                  disabled={isSyncing}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed"
                >
                  <svg
                    className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
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
                  <span>{isSyncing ? 'Syncing...' : 'Sync Manually'}</span>
                </button>
                {syncMessage && (
                  <p className="mt-2 text-xs font-medium text-slate-500 text-center">{syncMessage}</p>
                )}
              </div>
              <div className="border-t border-slate-200 py-4">
                <AuthSection
                  isLoaded={isLoaded}
                  isSignedIn={isSignedIn}
                  user={user}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:h-screen md:sticky md:top-0 md:border-r md:border-slate-200 md:bg-white">
        <div className="h-16 flex items-center px-4 border-b border-slate-200">
          <Link href="/jobs" className="text-slate-900 font-bold text-lg tracking-tight truncate">
            getajobchud.com
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          <NavLinks pathname={pathname} />
        </div>

        <div className="border-t border-slate-200 py-4">
          <AuthSection isLoaded={isLoaded} isSignedIn={isSignedIn} user={user} />
        </div>
      </aside>
    </>
  )
}
