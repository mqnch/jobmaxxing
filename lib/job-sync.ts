export const JOBS_SYNCED_EVENT = 'jobmaxxing-jobs-synced'

export type JobsSyncDetail = {
  type: 'success'
  message: string
  stats: {
    inserted: number
    updated: number
    deactivated: number
  }
}

function clearJobsCache() {
  localStorage.removeItem('jobs_cache_data_summer')
  localStorage.removeItem('jobs_cache_timestamp_summer')
  localStorage.removeItem('jobs_cache_data_winter')
  localStorage.removeItem('jobs_cache_timestamp_winter')
}

export async function syncLatestJobs(): Promise<JobsSyncDetail> {
  const response = await fetch('/api/jobs/sync', { method: 'POST' })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || result.error || 'Failed to sync')
  }

  clearJobsCache()

  const detail: JobsSyncDetail = {
    type: 'success',
    message: 'Successfully synchronized the latest jobs from GitHub.',
    stats: {
      inserted: result.stats?.inserted || 0,
      updated: result.stats?.updated || 0,
      deactivated: result.stats?.deactivated || 0,
    },
  }

  window.dispatchEvent(new CustomEvent<JobsSyncDetail>(JOBS_SYNCED_EVENT, { detail }))
  return detail
}
