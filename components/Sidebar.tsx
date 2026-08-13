'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useUser, UserButton, Show } from '@clerk/nextjs'
import { useSeason, Season } from '@/lib/season-context'

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
      label: 'Apps',
      icon: '📋',
      isActive: pathname === '/applications',
      onClick: () => {},
    },
  ]

  return (
    <nav className="flex flex-col">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.key === 'apps' ? '/applications' : '/jobs'}
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
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white">
            <NavLinks pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
            <div className="border-t border-slate-200 py-4">
              <AuthSection
                isLoaded={isLoaded}
                isSignedIn={isSignedIn}
                user={user}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}
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
