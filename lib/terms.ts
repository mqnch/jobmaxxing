export const TERM_YEAR = 27 // bump this when S28/W28 recruiting starts

export type Season = 'winter' | 'summer'

export function termFromSeason(season: Season | string | null | undefined) {
  return `${season === 'winter' ? 'W' : 'S'}${TERM_YEAR}`
}

export function currentTerms() {
  return [`W${TERM_YEAR}`, `S${TERM_YEAR}`] as const
}

export function clampInterviewRounds(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(4, Math.max(0, Math.round(n)))
}

export function roundsForStatus(status: string, currentRounds: number): number {
  if (status === 'applied' || status === 'not_applied') return 0
  if (status === 'interview' && currentRounds === 0) return 1
  return clampInterviewRounds(currentRounds)
}

export function statusForRounds(status: string, rounds: number): string {
  if (rounds > 0 && (status === 'applied' || status === 'not_applied')) {
    return 'interview'
  }
  return status
}
