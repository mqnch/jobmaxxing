import { loadEnvConfig } from '@next/env'
// Load environment variables from .env / .env.local files
loadEnvConfig(process.cwd())

import { runSync } from '../lib/sync'

async function main() {
  console.log('Starting local sync to populate the database...')
  try {
    const stats = await runSync()
    console.log('\n✅ Sync completed successfully!')
    console.log('--------------------------------')
    console.log(`Parsed:      ${stats.totalParsed} jobs total`)
    console.log(`Inserted:    ${stats.inserted} new jobs`)
    console.log(`Updated:     ${stats.updated} existing jobs`)
    console.log(`Deactivated: ${stats.deactivated} removed/old jobs`)
    if (stats.warnings) {
      console.warn(`⚠️ Warnings:  ${stats.warnings}`)
    }
  } catch (error) {
    console.error('\n❌ Sync failed:', error)
    process.exit(1)
  }
}

main()
