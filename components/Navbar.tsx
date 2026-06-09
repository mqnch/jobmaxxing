'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useUser, UserButton, Show } from '@clerk/nextjs'

export default function Navbar() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              href="/"
              className="flex items-center px-2 py-2 text-slate-900 font-bold hover:text-slate-700 transition-colors text-lg tracking-tight"
            >
              getajobchud.com
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className="border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                href="/jobs"
                className="border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                Jobs
              </Link>
              <Link
                href="/applications"
                className="border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                Applications
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {!isLoaded ? (
              <span className="text-slate-400 text-sm animate-pulse">Loading...</span>
            ) : (
              <>
                <Show when="signed-in">
                  <div className="hidden sm:flex items-center space-x-4">
                    <span className="text-slate-600 text-sm font-medium">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                    <UserButton />
                  </div>
                </Show>
                <Show when="signed-out">
                  <Link
                    href="/login"
                    className="hidden sm:block bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200"
                  >
                    Login
                  </Link>
                </Show>
              </>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden text-slate-700 p-2 rounded-md hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-inner">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md text-base font-medium transition-colors"
            >
              Home
            </Link>
            <Link
              href="/jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md text-base font-medium transition-colors"
            >
              Jobs
            </Link>
            <Link
              href="/applications"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md text-base font-medium transition-colors"
            >
              Applications
            </Link>
            {!isLoaded ? (
              <div className="px-3 py-2 text-slate-400 text-sm border-t border-slate-200 mt-2 pt-2">
                Loading...
              </div>
            ) : (
              <>
                <Show when="signed-in">
                  <div className="px-3 py-2 border-t border-slate-200 mt-2 pt-2 flex items-center justify-between">
                    <span className="text-slate-600 text-sm font-medium">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                    <UserButton />
                  </div>
                </Show>
                <Show when="signed-out">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-base font-semibold transition-colors mt-2"
                  >
                    Login
                  </Link>
                </Show>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
