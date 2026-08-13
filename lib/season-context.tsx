'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Season = 'summer' | 'winter'

interface SeasonContextValue {
  season: Season
  setSeason: (season: Season) => void
}

const SeasonContext = createContext<SeasonContextValue | undefined>(undefined)

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [season, setSeasonState] = useState<Season>('summer')

  useEffect(() => {
    const saved = localStorage.getItem('jobsActiveSeason')
    if (saved === 'summer' || saved === 'winter') {
      setSeasonState(saved)
    }
  }, [])

  const setSeason = (next: Season) => {
    setSeasonState(next)
    localStorage.setItem('jobsActiveSeason', next)
  }

  return (
    <SeasonContext.Provider value={{ season, setSeason }}>
      {children}
    </SeasonContext.Provider>
  )
}

export function useSeason() {
  const ctx = useContext(SeasonContext)
  if (!ctx) {
    throw new Error('useSeason must be used within a SeasonProvider')
  }
  return ctx
}
