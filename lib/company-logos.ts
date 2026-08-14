'use client'

import { useSyncExternalStore } from 'react'

export type LogoStatus = 'pending' | 'loaded' | 'missing'

type CacheEntry =
  | { status: 'pending' }
  | { status: 'loaded'; url: string }
  | { status: 'missing' }

const cache = new Map<string, CacheEntry>()
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version += 1
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getVersion() {
  return version
}

function getServerSnapshot() {
  return 0
}

export function normalizeCompanyName(name: string) {
  return name.trim().toLowerCase()
}

export function getLogoDevPublishableKey() {
  return process.env.NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY || ''
}

export function markCompanyLogoMissing(company: string) {
  const cacheKey = normalizeCompanyName(company)
  if (!cacheKey || cache.get(cacheKey)?.status === 'missing') return
  cache.set(cacheKey, { status: 'missing' })
  emit()
}

function rememberImage(cacheKey: string, url: string) {
  const img = new Image()
  img.onload = () => {
    cache.set(cacheKey, { status: 'loaded', url })
    emit()
  }
  img.onerror = () => {
    cache.set(cacheKey, { status: 'missing' })
    emit()
  }
  img.src = url
}

export function prefetchCompanyLogos(companies: string[]) {
  if (typeof window === 'undefined') return
  if (!getLogoDevPublishableKey()) return

  const toResolve: string[] = []
  const seen = new Set<string>()

  for (const company of companies) {
    const cacheKey = normalizeCompanyName(company)
    if (!cacheKey || seen.has(cacheKey) || cache.has(cacheKey)) continue
    seen.add(cacheKey)
    cache.set(cacheKey, { status: 'pending' })
    toResolve.push(company.trim())
  }

  if (toResolve.length === 0) return
  emit()

  void (async () => {
    try {
      const response = await fetch('/api/logos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies: toResolve }),
      })

      const data = response.ok ? await response.json() : { logos: {} }
      const logos = (data?.logos ?? {}) as Record<string, string | null>

      for (const company of toResolve) {
        const cacheKey = normalizeCompanyName(company)
        const url = logos[cacheKey]
        if (!url) {
          cache.set(cacheKey, { status: 'missing' })
          continue
        }
        rememberImage(cacheKey, url)
      }
      emit()
    } catch (error) {
      console.error('Error prefetching company logos:', error)
      for (const company of toResolve) {
        const cacheKey = normalizeCompanyName(company)
        if (cache.get(cacheKey)?.status === 'pending') {
          cache.set(cacheKey, { status: 'missing' })
        }
      }
      emit()
    }
  })()
}

export function useCompanyLogo(company: string): { status: LogoStatus; url: string | null } {
  useSyncExternalStore(subscribe, getVersion, getServerSnapshot)

  const cacheKey = normalizeCompanyName(company)
  const entry = cache.get(cacheKey)

  if (!getLogoDevPublishableKey()) {
    return { status: 'missing', url: null }
  }

  if (!entry) {
    return { status: 'pending', url: null }
  }

  if (entry.status === 'loaded') {
    return { status: 'loaded', url: entry.url }
  }

  return { status: entry.status, url: null }
}
