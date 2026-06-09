let playedSet = new Set<string>();

export function hasPlayed(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return playedSet.has(key);
}

export function markPlayed(key: string): void {
  if (typeof window === 'undefined') return;
  playedSet.add(key);
}
