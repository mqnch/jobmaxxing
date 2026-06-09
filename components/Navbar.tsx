'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useUser, UserButton, Show } from '@clerk/nextjs'

export default function Navbar() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-[#111111] border-b border-[rgba(255,255,255,0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              href="/"
              className="flex items-center px-2 py-2 text-[#f5f5f5] font-semibold hover:text-white transition-colors"
            >
              jobmaxxing
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className="border-transparent text-[#a0a0a0] hover:text-[#f5f5f5] hover:border-[#f5f5f5] inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                href="/jobs"
                className="border-transparent text-[#a0a0a0] hover:text-[#f5f5f5] hover:border-[#f5f5f5] inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                Jobs
              </Link>
              <Link
                href="/applications"
                className="border-transparent text-[#a0a0a0] hover:text-[#f5f5f5] hover:border-[#f5f5f5] inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
              >
                Applications
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {!isLoaded ? (
              <span className="text-[#a0a0a0] text-sm">Loading...</span>
            ) : (
              <>
                <Show when="signed-in">
                  <div className="hidden sm:flex items-center space-x-4">
                    <span className="text-[#a0a0a0] text-sm">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                    <UserButton />
                  </div>
                </Show>
                <Show when="signed-out">
                  <Link
                    href="/login"
                    className="hidden sm:block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Login
                  </Link>
                </Show>
              </>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden text-[#f5f5f5] p-2 rounded-md hover:bg-[#1a1a1a] transition-colors"
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
        <div className="sm:hidden border-t border-[rgba(255,255,255,0.1)]">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] rounded-md text-base font-medium transition-colors"
            >
              Home
            </Link>
            <Link
              href="/jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] rounded-md text-base font-medium transition-colors"
            >
              Jobs
            </Link>
            <Link
              href="/applications"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] rounded-md text-base font-medium transition-colors"
            >
              Applications
            </Link>
            {!isLoaded ? (
              <div className="px-3 py-2 text-[#a0a0a0] text-sm border-t border-[rgba(255,255,255,0.1)] mt-2 pt-2">
                Loading...
              </div>
            ) : (
              <>
                <Show when="signed-in">
                  <div className="px-3 py-2 border-t border-[rgba(255,255,255,0.1)] mt-2 pt-2 flex items-center justify-between">
                    <span className="text-[#a0a0a0] text-sm">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                    <UserButton />
                  </div>
                </Show>
                <Show when="signed-out">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-base font-medium transition-colors mt-2"
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
