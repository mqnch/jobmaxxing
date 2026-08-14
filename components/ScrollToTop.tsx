'use client'

import { useEffect, useState } from 'react'

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const scroller = document.getElementById('page-scroll')
    if (!scroller) return

    const onScroll = () => {
      setVisible(scroller.scrollTop > 240)
    }

    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    document.getElementById('page-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      className={`fixed bottom-5 right-5 z-40 flex items-center gap-2 h-11 px-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-all duration-200 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
      Top
    </button>
  )
}
