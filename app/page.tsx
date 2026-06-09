'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { hasPlayed, markPlayed } from '@/lib/animationState'

export default function Home() {
  const [animate, setAnimate] = useState(true)

  useEffect(() => {
    if (hasPlayed('home')) {
      setAnimate(false)
    } else {
      markPlayed('home')
    }
  }, [])

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col max-h-[calc(100vh-4rem)] bg-gradient-to-b from-transparent to-slate-50/30">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden min-h-0">
        <div className="max-w-5xl mx-auto w-full text-center py-4">
          <div className={`mb-8 ${animate ? 'animate-fade-in-up' : ''} inline-block`}>
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-slate-900 leading-tight tracking-tight">
              get a j*b.
            </h1>
          </div>

          <div className={animate ? 'animate-fade-in-up-delay-1' : ''}>
            <p className="text-xl sm:text-2xl md:text-3xl text-slate-600 mb-3 font-medium tracking-tight">
              stop scrolling and start applying, chud.
            </p>
            <p className="text-base sm:text-lg md:text-xl text-slate-500 mb-8 max-w-2xl mx-auto">
              jobmaxxing aggregates internships from SimplifyJobs and helps you track your applications.
            </p>
          </div>

          <div className={`mb-10 ${animate ? 'animate-fade-in-up-delay-2' : ''}`}>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-3 px-10 py-5 text-lg md:text-xl font-extrabold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors duration-200"
            >
              <span>start searching</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-400 to-transparent opacity-20"></div>
    </div>
  )
}
